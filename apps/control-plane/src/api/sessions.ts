import { Hono } from "hono";
import type { SessionManager } from "../session-manager.ts";
import type { CreateSessionBody } from "../types.ts";
import { SessionNotFoundError, InvalidTransitionError } from "../types.ts";

export function sessionRoutes(manager: SessionManager): Hono {
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
      if (e instanceof SessionNotFoundError) return c.json({ error: e.message }, 404);
      throw e;
    }
  });

  app.post("/:id/pause", async (c) => {
    try {
      const session = await manager.pause(c.req.param("id"));
      return c.json(session);
    } catch (e) {
      if (e instanceof SessionNotFoundError) return c.json({ error: e.message }, 404);
      if (e instanceof InvalidTransitionError) return c.json({ error: e.message }, 409);
      throw e;
    }
  });

  app.post("/:id/resume", async (c) => {
    try {
      const session = await manager.resume(c.req.param("id"));
      return c.json(session);
    } catch (e) {
      if (e instanceof SessionNotFoundError) return c.json({ error: e.message }, 404);
      if (e instanceof InvalidTransitionError) return c.json({ error: e.message }, 409);
      throw e;
    }
  });

  app.post("/:id/cancel", async (c) => {
    try {
      const session = await manager.cancel(c.req.param("id"));
      return c.json(session);
    } catch (e) {
      if (e instanceof SessionNotFoundError) return c.json({ error: e.message }, 404);
      if (e instanceof InvalidTransitionError) return c.json({ error: e.message }, 409);
      throw e;
    }
  });

  app.post("/:id/signal", async (c) => {
    try {
      manager.get(c.req.param("id")); // verify it exists
      const signal = await c.req.json();
      // TODO: forward signal to the agent process once node providers are wired
      return c.json({ ok: true, signal });
    } catch (e) {
      if (e instanceof SessionNotFoundError) return c.json({ error: e.message }, 404);
      throw e;
    }
  });

  return app;
}
