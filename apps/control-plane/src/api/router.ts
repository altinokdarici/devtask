import { Hono } from "hono";
import type { SessionManager } from "../session-manager.ts";
import { sessionRoutes } from "./sessions.ts";
import { eventRoutes } from "./events.ts";

export function createRouter(manager: SessionManager): Hono {
  const app = new Hono();
  app.route("/sessions", sessionRoutes(manager));
  app.route("/sessions", eventRoutes(manager));
  return app;
}
