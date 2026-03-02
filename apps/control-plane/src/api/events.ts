import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { SessionManager } from "../session-manager.ts";
import { SessionNotFoundError } from "../types.ts";

export function eventRoutes(manager: SessionManager): Hono {
  const app = new Hono();

  app.get("/:id/events", (c) => {
    const id = c.req.param("id");

    try {
      manager.get(id);
    } catch (e) {
      if (e instanceof SessionNotFoundError) {
        return c.json({ error: e.message }, 404);
      }
      throw e;
    }

    return streamSSE(c, async (stream) => {
      const session = manager.get(id);
      await stream.writeSSE({ event: "snapshot", data: JSON.stringify(session) });

      let closed = false;
      const unsubscribe = manager.subscribe(id, async (event) => {
        if (closed) {
          return;
        }
        await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
      });

      stream.onAbort(() => {
        closed = true;
        unsubscribe();
      });

      // Keep the stream alive until the client disconnects
      while (!closed) {
        await new Promise((resolve) => setTimeout(resolve, 30_000));
        if (closed) {
          break;
        }
        await stream.writeSSE({ event: "ping", data: "" });
      }
    });
  });

  return app;
}
