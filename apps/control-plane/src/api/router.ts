import { Hono } from "hono";
import type { SessionManager } from "../session-manager.ts";
import type { Dispatcher } from "../dispatcher.ts";
import { sessionRoutes } from "./sessions.ts";
import { eventRoutes } from "./events.ts";

export function createRouter(manager: SessionManager, dispatcher: Dispatcher): Hono {
  const app = new Hono();
  app.route("/sessions", sessionRoutes(manager, dispatcher));
  app.route("/sessions", eventRoutes(manager));
  return app;
}
