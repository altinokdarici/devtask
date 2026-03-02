import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SessionManager, type SessionEvent } from "./session-manager.ts";
import { Dispatcher } from "./dispatcher.ts";
import type { NodeProvider, NodeHandle } from "./providers/provider.ts";
import { ProviderRegistry } from "./providers/registry.ts";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { SessionStore } from "./types.ts";

function createMemoryStore(): SessionStore {
  return {
    async save() {},
    async loadAll() {
      return [];
    },
  };
}

interface MockProviderOptions {
  messages: SDKMessage[];
  keepAlive?: boolean;
}

function createMockProvider(_opts: MockProviderOptions): NodeProvider & { cancelled: boolean } {
  const result = {
    cancelled: false,
    async provision() {
      return {
        nodeId: "mock-node-1",
        spawnFn() {
          throw new Error("spawnFn should not be called directly in tests");
        },
        async destroy() {},
      } as NodeHandle;
    },
  };
  return result;
}

// We need to mock the SDK's query() function. Since the dispatcher imports it
// directly, we test through the full dispatch flow using a mock provider that
// controls the message sequence. The approach: subclass Dispatcher to inject
// a mock query generator.

function createRegistry(provider: NodeProvider): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register("local", provider);
  return registry;
}

class TestableDispatcher extends Dispatcher {
  private mockMessages: SDKMessage[];
  private mockKeepAlive: boolean;
  private mockAbortController: AbortController | null = null;

  constructor(manager: SessionManager, provider: NodeProvider, opts: MockProviderOptions) {
    super(manager, createRegistry(provider));
    this.mockMessages = opts.messages;
    this.mockKeepAlive = opts.keepAlive ?? false;
  }

  // Override dispatch to use our mock query instead of the real SDK
  async dispatch(sessionId: string): Promise<void> {
    const session = (this as unknown as { manager: SessionManager }).manager.get(sessionId);
    if (session.status !== "queued") return;

    const manager = (this as unknown as { manager: SessionManager }).manager;
    const providers = (this as unknown as { providers: ProviderRegistry }).providers;

    await manager.transition(sessionId, "provisioning");

    let handle: NodeHandle;
    try {
      const provider = providers.get(session.provider);
      handle = await provider.provision({ sessionId, provider: session.provider });
    } catch {
      await manager.transition(sessionId, "failed");
      return;
    }

    await manager.transition(sessionId, "running");

    const abortController = new AbortController();
    this.mockAbortController = abortController;
    const messages = this.mockMessages;
    const keepAlive = this.mockKeepAlive;

    // Create a mock async generator that yields our canned messages
    const mockQuery = (async function* () {
      for (const msg of messages) {
        if (abortController.signal.aborted) return;
        await new Promise((r) => setTimeout(r, 1));
        yield msg;
      }
      if (keepAlive) {
        await new Promise<void>((resolve) => {
          abortController.signal.addEventListener("abort", () => resolve());
        });
      }
    })() as unknown as import("@anthropic-ai/claude-agent-sdk").Query;
    mockQuery.close = () => {
      abortController.abort();
    };

    const active = (this as unknown as { active: Map<string, unknown> }).active;
    active.set(sessionId, { handle, query: mockQuery, abortController });

    // Call consumeMessages via the private method
    const consumeMessages = (
      this as unknown as {
        consumeMessages: (id: string, h: NodeHandle, q: unknown) => void;
      }
    ).consumeMessages.bind(this);
    consumeMessages(sessionId, handle, mockQuery);
  }
}

describe("Dispatcher", () => {
  let manager: SessionManager;

  beforeEach(async () => {
    manager = new SessionManager(createMemoryStore());
    await manager.init();
  });

  it("dispatches a queued session through provisioning → running → done", async () => {
    const mockProvider = createMockProvider({ messages: [] });

    const dispatcher = new TestableDispatcher(manager, mockProvider, {
      messages: [
        { type: "system", subtype: "init" } as SDKMessage,
        {
          type: "assistant",
          message: { content: [{ type: "text", text: "working" }] },
        } as unknown as SDKMessage,
        {
          type: "result",
          subtype: "success",
          is_error: false,
          duration_ms: 100,
          total_cost_usd: 0.01,
        } as unknown as SDKMessage,
      ],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "test task" });

    await new Promise((r) => setTimeout(r, 50));

    const updated = manager.get(session.id);
    assert.equal(updated.status, "done");
  });

  it("transitions to failed when result has error subtype", async () => {
    const mockProvider = createMockProvider({ messages: [] });

    const dispatcher = new TestableDispatcher(manager, mockProvider, {
      messages: [
        { type: "system", subtype: "init" } as SDKMessage,
        {
          type: "result",
          subtype: "error_during_execution",
          is_error: true,
          errors: ["boom"],
        } as unknown as SDKMessage,
      ],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "failing task" });

    await new Promise((r) => setTimeout(r, 50));

    const updated = manager.get(session.id);
    assert.equal(updated.status, "failed");
  });

  it("relays SDK messages through pub/sub", async () => {
    const mockProvider = createMockProvider({ messages: [] });

    const messages: SDKMessage[] = [
      {
        type: "system",
        subtype: "init",
        model: "claude-sonnet-4-20250514",
      } as unknown as SDKMessage,
      {
        type: "assistant",
        message: { content: [{ type: "text", text: "hello" }] },
      } as unknown as SDKMessage,
      { type: "result", subtype: "success", is_error: false } as unknown as SDKMessage,
    ];

    const dispatcher = new TestableDispatcher(manager, mockProvider, { messages });
    dispatcher.start();

    const session = await manager.create({ brief: "test" });
    const agentMessages: SDKMessage[] = [];
    manager.subscribe(session.id, (event) => {
      if (event.type === "agent_message") {
        agentMessages.push(event.message);
      }
    });

    await new Promise((r) => setTimeout(r, 50));

    assert.equal(agentMessages.length, 3);
    assert.equal(agentMessages[0].type, "system");
    assert.equal(agentMessages[1].type, "assistant");
    assert.equal(agentMessages[2].type, "result");
  });

  it("cancel aborts the query and transitions to cancelled", async () => {
    const mockProvider = createMockProvider({ messages: [] });

    const dispatcher = new TestableDispatcher(manager, mockProvider, {
      messages: [{ type: "system", subtype: "init" } as SDKMessage],
      keepAlive: true,
    });
    dispatcher.start();

    const session = await manager.create({ brief: "cancel me" });

    await new Promise((r) => setTimeout(r, 50));

    assert.equal(manager.get(session.id).status, "running");

    await dispatcher.cancel(session.id);

    assert.equal(manager.get(session.id).status, "cancelled");
  });

  it("handles provision failure gracefully", async () => {
    const failingProvider: NodeProvider = {
      async provision() {
        throw new Error("provision failed");
      },
    };

    const dispatcher = new TestableDispatcher(manager, failingProvider, {
      messages: [],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "doomed" });

    await new Promise((r) => setTimeout(r, 50));

    assert.equal(manager.get(session.id).status, "failed");
  });

  it("wildcard subscriber receives events for all sessions", async () => {
    const events: SessionEvent[] = [];
    manager.subscribe("*", (e) => events.push(e));

    await manager.create({ brief: "one" });
    await manager.create({ brief: "two" });

    assert.equal(events.length, 2);
    assert.equal(events[0].type, "created");
    assert.equal(events[1].type, "created");
  });
});
