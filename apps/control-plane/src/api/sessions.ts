import { Hono } from "hono";
import type { SessionManager } from "../session-manager.ts";
import type { Dispatcher } from "../dispatcher.ts";
import type { CreateSessionBody } from "@devtask/api-types";
import { SessionNotFoundError } from "../session-not-found-error.ts";
import { InvalidTransitionError } from "../invalid-transition-error.ts";

export function sessionRoutes(manager: SessionManager, dispatcher: Dispatcher): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = (await c.req.json()) as CreateSessionBody;
    if (!body.brief || typeof body.brief !== "string") {
      return c.json({ error: "brief is required" }, 400);
    }
    const session = await manager.create(body);
    return c.json(session, 201);
  });

  app.get("/", (c) => {
    return c.json(manager.list());
  });

  app.get("/:id", (c) => {
    try {
      return c.json(manager.get(c.req.param("id")));
    } catch (e) {
      if (e instanceof SessionNotFoundError) {
        return c.json({ error: e.message }, 404);
      }
      throw e;
    }
  });

  app.post("/:id/pause", async (c) => {
    try {
      const session = await manager.pause(c.req.param("id"));
      return c.json(session);
    } catch (e) {
      if (e instanceof SessionNotFoundError) {
        return c.json({ error: e.message }, 404);
      }
      if (e instanceof InvalidTransitionError) {
        return c.json({ error: e.message }, 409);
      }
      throw e;
    }
  });

  app.post("/:id/resume", async (c) => {
    try {
      const session = await manager.resume(c.req.param("id"));
      return c.json(session);
    } catch (e) {
      if (e instanceof SessionNotFoundError) {
        return c.json({ error: e.message }, 404);
      }
      if (e instanceof InvalidTransitionError) {
        return c.json({ error: e.message }, 409);
      }
      throw e;
    }
  });

  app.post("/:id/cancel", async (c) => {
    try {
      await dispatcher.cancel(c.req.param("id"));
      const session = manager.get(c.req.param("id"));
      return c.json(session);
    } catch (e) {
      if (e instanceof SessionNotFoundError) {
        return c.json({ error: e.message }, 404);
      }
      if (e instanceof InvalidTransitionError) {
        return c.json({ error: e.message }, 409);
      }
      throw e;
    }
  });

  return app;
}
