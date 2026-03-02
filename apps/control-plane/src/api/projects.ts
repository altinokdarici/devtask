import { Hono } from "hono";
import type { CreateProjectBody } from "@devtask/api-types";
import type { ProjectManager } from "../project-manager.ts";
import type { SessionManager } from "../session-manager.ts";
import { ProjectNotFoundError } from "../project-not-found-error.ts";

const TERMINAL_STATUSES = new Set(["done", "failed", "cancelled"]);

export function projectRoutes(
  projectManager: ProjectManager,
  sessionManager: SessionManager,
): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = (await c.req.json()) as CreateProjectBody;
    if (!body.name || typeof body.name !== "string") {
      return c.json({ error: "name is required" }, 400);
    }
    if (!body.provider || !body.provider.type) {
      return c.json({ error: "provider is required" }, 400);
    }
    const project = await projectManager.create(body);
    return c.json(project, 201);
  });

  app.get("/", (c) => {
    return c.json(projectManager.list());
  });

  app.get("/:id", (c) => {
    try {
      return c.json(projectManager.get(c.req.param("id")));
    } catch (e) {
      if (e instanceof ProjectNotFoundError) {
        return c.json({ error: e.message }, 404);
      }
      throw e;
    }
  });

  app.delete("/:id", async (c) => {
    try {
      const projectId = c.req.param("id");
      projectManager.get(projectId);

      const activeSessions = sessionManager
        .list()
        .filter((s) => s.projectId === projectId && !TERMINAL_STATUSES.has(s.status));

      if (activeSessions.length > 0) {
        return c.json(
          { error: `Cannot delete project with ${activeSessions.length} active session(s)` },
          409,
        );
      }

      await projectManager.delete(projectId);
      return c.body(null, 204);
    } catch (e) {
      if (e instanceof ProjectNotFoundError) {
        return c.json({ error: e.message }, 404);
      }
      throw e;
    }
  });

  return app;
}
