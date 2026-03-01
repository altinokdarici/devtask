import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { SessionManager } from "./session-manager.ts";
import { Dispatcher } from "./dispatcher.ts";
import { createRouter } from "./api/router.ts";
import type { Session } from "./types.ts";
import type { SessionStore } from "./types.ts";
import type { NodeProvider, NodeHandle } from "./providers/provider.ts";
import { ProviderRegistry } from "./providers/registry.ts";
import type { SDKMessage, Query } from "@anthropic-ai/claude-agent-sdk";

function createMemoryStore(): SessionStore {
  return {
    async save() {},
    async loadAll() {
      return [];
    },
  };
}

// A mock provider + dispatcher combo that emits canned SDK messages
// without requiring a real Claude process.
function createMockSdkProvider(): NodeProvider {
  return {
    async provision() {
      return {
        nodeId: "e2e-mock-node",
        spawnFn() {
          throw new Error("should not be called");
        },
        async destroy() {},
      } as NodeHandle;
    },
  };
}

function createRegistry(provider: NodeProvider): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register("local", provider);
  return registry;
}

class MockDispatcher extends Dispatcher {
  private mockMessages: SDKMessage[];

  constructor(manager: SessionManager, provider: NodeProvider, messages: SDKMessage[]) {
    super(manager, createRegistry(provider));
    this.mockMessages = messages;
  }

  async dispatch(sessionId: string): Promise<void> {
    const manager = (this as unknown as { manager: SessionManager }).manager;
    const providers = (this as unknown as { providers: ProviderRegistry }).providers;
    const session = manager.get(sessionId);
    if (session.status !== "queued") return;

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
    const messages = this.mockMessages;

    const mockQuery = (async function* () {
      for (const msg of messages) {
        if (abortController.signal.aborted) return;
        await new Promise((r) => setTimeout(r, 5));
        yield msg;
      }
    })() as unknown as Query;
    mockQuery.close = () => abortController.abort();

    const active = (this as unknown as { active: Map<string, unknown> }).active;
    active.set(sessionId, { handle, query: mockQuery, abortController });

    const consumeMessages = (
      this as unknown as {
        consumeMessages: (id: string, h: NodeHandle, q: unknown) => void;
      }
    ).consumeMessages.bind(this);
    consumeMessages(sessionId, handle, mockQuery);
  }
}

describe("E2E integration", () => {
  let server: ServerType;
  let baseUrl: string;
  let manager: SessionManager;

  const mockMessages: SDKMessage[] = [
    { type: "system", subtype: "init", model: "claude-sonnet-4-20250514" } as unknown as SDKMessage,
    {
      type: "assistant",
      message: { content: [{ type: "text", text: "Working on: e2e test task" }] },
    } as unknown as SDKMessage,
    {
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 100,
      total_cost_usd: 0.01,
    } as unknown as SDKMessage,
  ];

  before(async () => {
    manager = new SessionManager(createMemoryStore());
    await manager.init();

    const provider = createMockSdkProvider();
    const dispatcher = new MockDispatcher(manager, provider, mockMessages);
    dispatcher.start();

    const app = new Hono();
    app.get("/health", (c) => c.json({ status: "ok" }));
    app.route("/", createRouter(manager, dispatcher));

    await new Promise<void>((resolve) => {
      server = serve({ fetch: app.fetch, port: 0 }, (info) => {
        baseUrl = `http://localhost:${info.port}`;
        resolve();
      });
    });
  });

  after(() => {
    server?.close();
  });

  it("health check returns ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
  });

  it("full session lifecycle: create → run → done", async () => {
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: "e2e test task" }),
    });
    assert.equal(createRes.status, 201);
    const session: Session = await createRes.json();
    assert.equal(session.brief, "e2e test task");
    assert.ok(session.id);

    // Stream SSE events until the session reaches "done"
    const events: Array<{ event: string; data: string }> = [];

    const eventsRes = await fetch(`${baseUrl}/sessions/${session.id}/events`);
    assert.equal(eventsRes.status, 200);

    const reader = eventsRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const timeout = setTimeout(() => {
      reader.cancel();
    }, 10_000);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        let currentEvent = "";
        let currentData = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentData = line.slice(5).trim();
          } else if (line === "") {
            if (currentEvent && currentData) {
              events.push({ event: currentEvent, data: currentData });

              if (currentEvent === "updated") {
                const parsed = JSON.parse(currentData);
                if (parsed.session?.status === "done" || parsed.session?.status === "failed") {
                  reader.cancel();
                  break;
                }
              }
            }
            currentEvent = "";
            currentData = "";
          }
        }

        const finalSession = manager.get(session.id);
        if (finalSession.status === "done" || finalSession.status === "failed") {
          reader.cancel();
          break;
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    const finalSession = manager.get(session.id);
    assert.equal(finalSession.status, "done");

    assert.ok(events.length > 0, "should have received SSE events");
    assert.equal(events[0].event, "snapshot");

    const agentMessages = events.filter((e) => e.event === "agent_message");
    assert.ok(agentMessages.length > 0, "should have received agent messages");
  });

  it("session list returns created sessions", async () => {
    const res = await fetch(`${baseUrl}/sessions`);
    assert.equal(res.status, 200);
    const sessions: Session[] = await res.json();
    assert.ok(sessions.length >= 1);
  });

  it("create session rejects missing brief", async () => {
    const res = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  it("get nonexistent session returns 404", async () => {
    const res = await fetch(`${baseUrl}/sessions/nonexistent`);
    assert.equal(res.status, 404);
  });
});
