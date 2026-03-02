import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { SessionManager } from "./session-manager.ts";
import { Dispatcher } from "./dispatcher.ts";
import { createRouter } from "./api/router.ts";
import type { Session } from "@devtask/api-types";
import type { SessionStore } from "./session-store.type.ts";
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

interface ActiveEntry {
  handle: NodeHandle;
  query: unknown;
  abortController: AbortController;
  agentSessionId: string | null;
}

class MockDispatcher extends Dispatcher {
  private turns: SDKMessage[][];
  private turnIndex = 0;

  constructor(manager: SessionManager, provider: NodeProvider, turns: SDKMessage[][]) {
    super(manager, createRegistry(provider));
    this.turns = turns;
  }

  async dispatch(sessionId: string): Promise<void> {
    const manager = (this as unknown as { manager: SessionManager }).manager;
    const providers = (this as unknown as { providers: ProviderRegistry }).providers;
    const session = manager.get(sessionId);
    if (session.status !== "queued") {
      return;
    }

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
    await manager.update(sessionId, { nodeId: handle.nodeId });

    const abortController = new AbortController();
    const messages = this.turns[this.turnIndex] ?? [];
    this.turnIndex++;

    const mockQuery = (async function* () {
      for (const msg of messages) {
        if (abortController.signal.aborted) {
          return;
        }
        await new Promise((r) => setTimeout(r, 5));
        yield msg;
      }
    })() as unknown as Query;
    mockQuery.close = () => abortController.abort();

    const active = (this as unknown as { active: Map<string, ActiveEntry> }).active;
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
        await new Promise((r) => setTimeout(r, 5));
        yield msg;
      }
    })() as unknown as Query;
    mockQuery.close = () => abortController.abort();

    entry.query = mockQuery;

    const consumeMessages = (
      this as unknown as {
        consumeMessages: (id: string, q: unknown) => void;
      }
    ).consumeMessages.bind(this);
    consumeMessages(sessionId, mockQuery);
  }
}

function waitForStatus(
  manager: SessionManager,
  id: string,
  status: string,
  timeoutMs = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for ${status}`)),
      timeoutMs,
    );
    const check = () => {
      if (manager.get(id).status === status) {
        clearTimeout(timeout);
        resolve();
      }
    };
    check();
    manager.subscribe(id, () => check());
  });
}

describe("E2E integration", () => {
  let server: ServerType;
  let baseUrl: string;
  let manager: SessionManager;

  const turn1Messages: SDKMessage[] = [
    {
      type: "system",
      subtype: "init",
      session_id: "sdk-session-1",
      model: "claude-sonnet-4-20250514",
    } as unknown as SDKMessage,
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

  const turn2Messages: SDKMessage[] = [
    {
      type: "assistant",
      message: { content: [{ type: "text", text: "Continuing after reply" }] },
    } as unknown as SDKMessage,
    {
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 50,
      total_cost_usd: 0.005,
    } as unknown as SDKMessage,
  ];

  before(async () => {
    manager = new SessionManager(createMemoryStore());
    await manager.init();

    const provider = createMockSdkProvider();
    const validationTurnMessages: SDKMessage[] = [
      { type: "system", subtype: "init", session_id: "sdk-session-2" } as unknown as SDKMessage,
      { type: "result", subtype: "success", is_error: false } as unknown as SDKMessage,
    ];
    const dispatcher = new MockDispatcher(manager, provider, [
      turn1Messages,
      turn2Messages,
      validationTurnMessages,
    ]);
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

  it("full multi-turn lifecycle: create → run → waiting_for_input → reply → waiting_for_input → complete → done", async () => {
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: "e2e multi-turn task" }),
    });
    assert.equal(createRes.status, 201);
    const session: Session = await createRes.json();
    assert.ok(session.id);

    await waitForStatus(manager, session.id, "waiting_for_input");
    assert.equal(manager.get(session.id).status, "waiting_for_input");

    const replyRes = await fetch(`${baseUrl}/sessions/${session.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "continue with more detail" }),
    });
    assert.equal(replyRes.status, 200);

    await waitForStatus(manager, session.id, "waiting_for_input");
    assert.equal(manager.get(session.id).status, "waiting_for_input");

    const completeRes = await fetch(`${baseUrl}/sessions/${session.id}/complete`, {
      method: "POST",
    });
    assert.equal(completeRes.status, 200);
    assert.equal(manager.get(session.id).status, "done");
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

  it("reply rejects missing message", async () => {
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: "validation test" }),
    });
    const session: Session = await createRes.json();

    await waitForStatus(manager, session.id, "waiting_for_input");

    const res = await fetch(`${baseUrl}/sessions/${session.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });
});
