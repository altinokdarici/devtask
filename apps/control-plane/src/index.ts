import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { loadConfig } from "@devtask/config";
import { SessionManager } from "./session-manager.ts";
import { createFileStore } from "./session-store.ts";
import { ProjectManager } from "./project-manager.ts";
import { createProjectFileStore } from "./project-store.ts";
import { Dispatcher } from "./dispatcher.ts";
import { createRouter } from "./api/router.ts";

const config = loadConfig();

const sessionManager = new SessionManager(createFileStore());
await sessionManager.init();

const projectManager = new ProjectManager(createProjectFileStore());
await projectManager.init();

const dispatcher = new Dispatcher(sessionManager, projectManager);
dispatcher.start();

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/api", createRouter(sessionManager, projectManager, dispatcher));

serve({ fetch: app.fetch, port: config.controlPlane.port }, () => {
  console.log(`control-plane listening on :${config.controlPlane.port}`);
});
