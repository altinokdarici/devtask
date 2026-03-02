import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { SessionManager } from "./session-manager.ts";
import { Dispatcher } from "./dispatcher.ts";
import { createLocalProvider } from "./providers/local.ts";
import { ProviderRegistry } from "./providers/registry.ts";
import { createRouter } from "./api/router.ts";
import type { Session } from "@devtask/api-types";
import type { SessionStore } from "./session-store.type.ts";

const SKIP = !process.env["ANTHROPIC_API_KEY"];

function createMemoryStore(): SessionStore {
  return {
    async save() {},
    async loadAll() {
      return [];
    },
  };
}

describe("SDK integration (requires ANTHROPIC_API_KEY)", { skip: SKIP }, () => {
  let server: ServerType;
  let baseUrl: string;
  let manager: SessionManager;

  before(async () => {
    manager = new SessionManager(createMemoryStore());
    await manager.init();

    const providers = new ProviderRegistry();
    providers.register("local", createLocalProvider());

    const dispatcher = new Dispatcher(manager, providers);
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

  it("runs a real SDK query through the full stack", async () => {
    const createRes = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brief: 'Reply with exactly the text "hello world" and nothing else.',
        provider: "local",
      }),
    });
    assert.equal(createRes.status, 201);
    const session: Session = await createRes.json();

    // Poll until the session reaches a terminal state
    const deadline = Date.now() + 120_000;
    let finalStatus = session.status;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`${baseUrl}/sessions/${session.id}`);
      const current: Session = await res.json();
      finalStatus = current.status;
      if (finalStatus === "done" || finalStatus === "failed" || finalStatus === "cancelled") {
        break;
      }
    }

    assert.equal(finalStatus, "done", `Expected done but got ${finalStatus}`);
  });
});
