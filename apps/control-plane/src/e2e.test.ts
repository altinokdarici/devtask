import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { SessionManager } from "./session-manager.ts";
import { Dispatcher } from "./dispatcher.ts";
import { createLocalProvider } from "./providers/local.ts";
import { createRouter } from "./api/router.ts";
import type { Session } from "./types.ts";
import type { SessionStore } from "./types.ts";

function createMemoryStore(): SessionStore {
  return {
    async save() {},
    async loadAll() {
      return [];
    },
  };
}

describe("E2E integration", () => {
  let server: ServerType;
  let baseUrl: string;
  let manager: SessionManager;

  before(async () => {
    manager = new SessionManager(createMemoryStore());
    await manager.init();

    const agentEntry = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../agent-runtime/src/index.ts",
    );
    const provider = createLocalProvider("node", [
      "--experimental-strip-types",
      agentEntry,
    ]);
    const dispatcher = new Dispatcher(manager, provider);
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
    // Create a session
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

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop()!; // Keep incomplete line in buffer

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

              // Check if session reached terminal state
              if (currentEvent === "updated") {
                const parsed = JSON.parse(currentData);
                if (
                  parsed.session?.status === "done" ||
                  parsed.session?.status === "failed"
                ) {
                  reader.cancel();
                  break;
                }
              }
            }
            currentEvent = "";
            currentData = "";
          }
        }

        // Check if we already cancelled above
        const finalSession = manager.get(session.id);
        if (
          finalSession.status === "done" ||
          finalSession.status === "failed"
        ) {
          reader.cancel();
          break;
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    // Verify the session ended up in "done" state
    const finalSession = manager.get(session.id);
    assert.equal(finalSession.status, "done");

    // Verify we got a snapshot event first
    assert.ok(events.length > 0, "should have received SSE events");
    assert.equal(events[0].event, "snapshot");

    // Verify we got agent_message events with log messages
    const agentMessages = events.filter((e) => e.event === "agent_message");
    assert.ok(agentMessages.length > 0, "should have received agent messages");

    // Verify at least one log message about the task
    const logMessages = agentMessages
      .map((e) => JSON.parse(e.data))
      .filter((d) => d.message?.type === "log");
    assert.ok(logMessages.length > 0, "should have received log messages");
    assert.ok(
      logMessages.some((m) =>
        m.message.text.includes("e2e test task"),
      ),
      "should include the task brief in logs",
    );
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

  it("cancel a running session", async () => {
    // Create a new session — the mock agent takes ~300ms to complete
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: "cancel test" }),
    });
    const session: Session = await createRes.json();

    // Wait briefly for it to start running
    await new Promise((r) => setTimeout(r, 200));

    // Cancel it
    const cancelRes = await fetch(
      `${baseUrl}/sessions/${session.id}/cancel`,
      { method: "POST" },
    );
    assert.equal(cancelRes.status, 200);
    const cancelled: Session = await cancelRes.json();
    assert.equal(cancelled.status, "cancelled");
  });
});
