import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env["PORT"] ?? 4000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`control-plane listening on :${port}`);
});
