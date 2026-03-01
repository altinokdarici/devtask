import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { loadConfig } from "@devtask/config";
import { SessionManager } from "./session-manager.ts";
import { createFileStore } from "./session-store.ts";
import { Dispatcher } from "./dispatcher.ts";
import { createLocalProvider } from "./providers/local.ts";
import { createRouter } from "./api/router.ts";

const config = loadConfig();

const manager = new SessionManager(createFileStore());
await manager.init();

const provider = createLocalProvider();
const dispatcher = new Dispatcher(manager, provider);
dispatcher.start();

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/", createRouter(manager, dispatcher));

serve({ fetch: app.fetch, port: config.controlPlane.port }, () => {
  console.log(`control-plane listening on :${config.controlPlane.port}`);
});
