import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { SessionManager } from "./session-manager.ts";
import { createFileStore } from "./session-store.ts";
import { createRouter } from "./api/router.ts";

const manager = new SessionManager(createFileStore());
await manager.init();

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/", createRouter(manager));

const port = Number(process.env["PORT"] ?? 4000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`control-plane listening on :${port}`);
});
