import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { loadConfig } from "@devtask/config";
import { SessionManager } from "./session-manager.ts";
import { createFileStore } from "./session-store.ts";
import { Dispatcher } from "./dispatcher.ts";
import { createLocalProvider } from "./providers/local.ts";
import { createCodespaceProvider } from "./providers/codespace.ts";
import { createRouter } from "./api/router.ts";
import type { NodeProvider } from "./providers/provider.ts";

const config = loadConfig();

const manager = new SessionManager(createFileStore());
await manager.init();

function buildProvider(): NodeProvider {
  if (config.provider.default === "codespace") {
    return createCodespaceProvider({
      repo: config.codespace.repo,
      machine: config.codespace.machine,
    });
  }

  const agentEntry = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../agent-runtime/src/index.ts",
  );
  return createLocalProvider("node", ["--experimental-strip-types", agentEntry]);
}

const provider = buildProvider();
const dispatcher = new Dispatcher(manager, provider);
dispatcher.start();

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/", createRouter(manager, dispatcher));

serve({ fetch: app.fetch, port: config.controlPlane.port }, () => {
  console.log(`control-plane listening on :${config.controlPlane.port}`);
});
