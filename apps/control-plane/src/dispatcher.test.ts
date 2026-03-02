import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SessionManager, type SessionEvent } from "./session-manager.ts";
import { ProjectManager } from "./project-manager.ts";
import { Dispatcher } from "./dispatcher.ts";
import type { NodeProvider, NodeHandle } from "./providers/provider.ts";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { SessionStore } from "./session-store.type.ts";
import type { MessageStore } from "./message-store.type.ts";
import type { ProjectStore } from "./project-store.type.ts";

function createMemorySessionStore(): SessionStore {
  return {
    async save() {},
    async loadAll() {
      return [];
    },
  };
}

function createMemoryMessageStore(): MessageStore {
  const messages = new Map<string, unknown[]>();
  return {
    async append(sessionId: string, message: unknown) {
      let list = messages.get(sessionId);
      if (!list) {
        list = [];
        messages.set(sessionId, list);
      }
      list.push(message);
    },
    async loadAll(sessionId: string) {
      return messages.get(sessionId) ?? [];
    },
  };
}

function createMemoryProjectStore(): ProjectStore {
  return {
    async save() {},
    async remove() {},
    async loadAll() {
      return [];
    },
  };
}

interface MockProviderOptions {
  turns: SDKMessage[][];
  keepAlive?: boolean;
}

function createMockProvider(_opts: MockProviderOptions): NodeProvider & { destroyed: boolean } {
  const result = {
    destroyed: false,
    async provision() {
      return {
        nodeId: "mock-node-1",
        spawnFn() {
          throw new Error("spawnFn should not be called directly in tests");
        },
        async destroy() {
          result.destroyed = true;
        },
      } as NodeHandle;
    },
  };
  return result;
}

class TestableDispatcher extends Dispatcher {
  private turns: SDKMessage[][];
  private turnIndex = 0;
  private mockKeepAlive: boolean;
  private mockProvider: NodeProvider;

  constructor(
    manager: SessionManager,
    projectManager: ProjectManager,
    provider: NodeProvider,
    opts: MockProviderOptions,
  ) {
    super(manager, projectManager);
    this.turns = opts.turns;
    this.mockKeepAlive = opts.keepAlive ?? false;
    this.mockProvider = provider;
  }

  async dispatch(sessionId: string): Promise<void> {
    const session = (this as unknown as { manager: SessionManager }).manager.get(sessionId);
    if (session.status !== "queued") {
      return;
    }

    const manager = (this as unknown as { manager: SessionManager }).manager;

    await manager.transition(sessionId, "provisioning");

    let handle: NodeHandle;
    try {
      handle = await this.mockProvider.provision({ sessionId, provider: "local" });
    } catch {
      await manager.transition(sessionId, "failed");
      return;
    }

    await manager.transition(sessionId, "running");
    await manager.update(sessionId, { nodeId: handle.nodeId });

    const abortController = new AbortController();
    const messages = this.turns[this.turnIndex] ?? [];
    this.turnIndex++;
    const keepAlive = this.mockKeepAlive;

    const mockQuery = (async function* () {
      for (const msg of messages) {
        if (abortController.signal.aborted) {
          return;
        }
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
    active.set(sessionId, { handle, query: mockQuery, abortController, agentSessionId: null });

    const consumeMessages = (
      this as unknown as {
        consumeMessages: (id: string, q: unknown) => void;
      }
    ).consumeMessages.bind(this);
    consumeMessages(sessionId, mockQuery);
  }

  async reply(sessionId: string, _message: string): Promise<void> {
    const manager = (this as unknown as { manager: SessionManager }).manager;
    const active = (this as unknown as { active: Map<string, ActiveEntry> }).active;
    const entry = active.get(sessionId);
    if (!entry) {
      throw new Error(`No active session for ${sessionId}`);
    }

    await manager.transition(sessionId, "running");

    const abortController = new AbortController();
    entry.abortController = abortController;
    const messages = this.turns[this.turnIndex] ?? [];
    this.turnIndex++;

    const mockQuery = (async function* () {
      for (const msg of messages) {
        if (abortController.signal.aborted) {
          return;
        }
        await new Promise((r) => setTimeout(r, 1));
        yield msg;
      }
    })() as unknown as import("@anthropic-ai/claude-agent-sdk").Query;
    mockQuery.close = () => {
      abortController.abort();
    };

    entry.query = mockQuery;

    const consumeMessages = (
      this as unknown as {
        consumeMessages: (id: string, q: unknown) => void;
      }
    ).consumeMessages.bind(this);
    consumeMessages(sessionId, mockQuery);
  }
}

interface ActiveEntry {
  handle: NodeHandle;
  query: unknown;
  abortController: AbortController;
  agentSessionId: string | null;
}

describe("Dispatcher", () => {
  let manager: SessionManager;
  let projectManager: ProjectManager;
  let projectId: string;

  beforeEach(async () => {
    manager = new SessionManager(createMemorySessionStore(), createMemoryMessageStore());
    await manager.init();
    projectManager = new ProjectManager(createMemoryProjectStore());
    await projectManager.init();
    const project = await projectManager.create({
      name: "test-project",
      provider: { type: "local", workDir: "/tmp/test" },
    });
    projectId = project.id;
  });

  it("dispatches a queued session through provisioning -> running -> waiting_for_input", async () => {
    const mockProvider = createMockProvider({ turns: [] });

    const dispatcher = new TestableDispatcher(manager, projectManager, mockProvider, {
      turns: [
        [
          { type: "system", subtype: "init", session_id: "sdk-session-1" } as unknown as SDKMessage,
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
      ],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "test task", projectId });

    await new Promise((r) => setTimeout(r, 50));

    const updated = manager.get(session.id);
    assert.equal(updated.status, "waiting_for_input");
    assert.equal(updated.nodeId, "mock-node-1");
    assert.equal(updated.agentSessionId, "sdk-session-1");
  });

  it("reply resumes and goes back to waiting_for_input", async () => {
    const mockProvider = createMockProvider({ turns: [] });

    const dispatcher = new TestableDispatcher(manager, projectManager, mockProvider, {
      turns: [
        [
          { type: "system", subtype: "init", session_id: "sdk-session-1" } as unknown as SDKMessage,
          { type: "result", subtype: "success", is_error: false } as unknown as SDKMessage,
        ],
        [
          {
            type: "assistant",
            message: { content: [{ type: "text", text: "continued" }] },
          } as unknown as SDKMessage,
          { type: "result", subtype: "success", is_error: false } as unknown as SDKMessage,
        ],
      ],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "multi-turn", projectId });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(manager.get(session.id).status, "waiting_for_input");

    await dispatcher.reply(session.id, "continue please");
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(manager.get(session.id).status, "waiting_for_input");
  });

  it("complete destroys handle and transitions to done", async () => {
    const mockProvider = createMockProvider({ turns: [] });

    const dispatcher = new TestableDispatcher(manager, projectManager, mockProvider, {
      turns: [
        [
          { type: "system", subtype: "init", session_id: "sdk-session-1" } as unknown as SDKMessage,
          { type: "result", subtype: "success", is_error: false } as unknown as SDKMessage,
        ],
      ],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "complete me", projectId });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(manager.get(session.id).status, "waiting_for_input");

    await dispatcher.complete(session.id);
    assert.equal(manager.get(session.id).status, "done");
    assert.equal(mockProvider.destroyed, true);
  });

  it("cancel from waiting_for_input works", async () => {
    const mockProvider = createMockProvider({ turns: [] });

    const dispatcher = new TestableDispatcher(manager, projectManager, mockProvider, {
      turns: [
        [
          { type: "system", subtype: "init", session_id: "sdk-session-1" } as unknown as SDKMessage,
          { type: "result", subtype: "success", is_error: false } as unknown as SDKMessage,
        ],
      ],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "cancel me", projectId });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(manager.get(session.id).status, "waiting_for_input");

    await dispatcher.cancel(session.id);
    assert.equal(manager.get(session.id).status, "cancelled");
    assert.equal(mockProvider.destroyed, true);
  });

  it("transitions to failed when result has error subtype", async () => {
    const mockProvider = createMockProvider({ turns: [] });

    const dispatcher = new TestableDispatcher(manager, projectManager, mockProvider, {
      turns: [
        [
          { type: "system", subtype: "init" } as SDKMessage,
          {
            type: "result",
            subtype: "error_during_execution",
            is_error: true,
            errors: ["boom"],
          } as unknown as SDKMessage,
        ],
      ],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "failing task", projectId });

    await new Promise((r) => setTimeout(r, 50));

    const updated = manager.get(session.id);
    assert.equal(updated.status, "failed");
    assert.equal(mockProvider.destroyed, true);
  });

  it("relays SDK messages through pub/sub", async () => {
    const mockProvider = createMockProvider({ turns: [] });

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

    const dispatcher = new TestableDispatcher(manager, projectManager, mockProvider, {
      turns: [messages],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "test", projectId });
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
    const mockProvider = createMockProvider({ turns: [] });

    const dispatcher = new TestableDispatcher(manager, projectManager, mockProvider, {
      turns: [[{ type: "system", subtype: "init" } as SDKMessage]],
      keepAlive: true,
    });
    dispatcher.start();

    const session = await manager.create({ brief: "cancel me", projectId });

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

    const dispatcher = new TestableDispatcher(manager, projectManager, failingProvider, {
      turns: [],
    });
    dispatcher.start();

    const session = await manager.create({ brief: "doomed", projectId });

    await new Promise((r) => setTimeout(r, 50));

    assert.equal(manager.get(session.id).status, "failed");
  });

  it("wildcard subscriber receives events for all sessions", async () => {
    const events: SessionEvent[] = [];
    manager.subscribe("*", (e) => events.push(e));

    await manager.create({ brief: "one", projectId });
    await manager.create({ brief: "two", projectId });

    assert.equal(events.length, 2);
    assert.equal(events[0].type, "created");
    assert.equal(events[1].type, "created");
  });
});
