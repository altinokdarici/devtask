import { Hono } from "hono";
import type { SessionManager } from "../session-manager.ts";
import type { ProjectManager } from "../project-manager.ts";
import type { Dispatcher } from "../dispatcher.ts";
import { sessionRoutes } from "./sessions.ts";
import { eventRoutes } from "./events.ts";
import { projectRoutes } from "./projects.ts";

export function createRouter(
  sessionManager: SessionManager,
  projectManager: ProjectManager,
  dispatcher: Dispatcher,
): Hono {
  const app = new Hono();
  app.route("/sessions", sessionRoutes(sessionManager, dispatcher));
  app.route("/sessions", eventRoutes(sessionManager));
  app.route("/projects", projectRoutes(projectManager, sessionManager));
  return app;
}
