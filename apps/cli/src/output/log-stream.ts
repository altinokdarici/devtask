export function renderEvent(event: string, data: string): void {
  if (event === "ping") return;

  try {
    const parsed = JSON.parse(data);

    if (event === "snapshot") {
      console.log(`[session] ${parsed.status} — ${parsed.brief}`);
      return;
    }

    if (event === "agent_message") {
      const msg = parsed.message;

      if (msg.type === "assistant") {
        const blocks = msg.message?.content ?? [];
        for (const block of blocks) {
          if (block.type === "text") {
            console.log(`[assistant] ${block.text}`);
          } else if (block.type === "tool_use") {
            console.log(`[tool] ${block.name}`);
          }
        }
        return;
      }

      if (msg.type === "result") {
        const status = msg.is_error ? "error" : "success";
        const cost = msg.total_cost_usd != null ? ` ($${msg.total_cost_usd.toFixed(4)})` : "";
        const duration = msg.duration_ms != null ? ` ${(msg.duration_ms / 1000).toFixed(1)}s` : "";
        console.log(`[result] ${status}${duration}${cost}`);
        return;
      }

      if (msg.type === "system") {
        if (msg.subtype === "init") {
          console.log(`[system] model=${msg.model ?? "unknown"}`);
        }
        return;
      }

      // Other SDK message types: log type label
      console.log(`[${msg.type}]`);
      return;
    }

    if (event === "updated") {
      console.log(`[updated] ${parsed.session.status}`);
      return;
    }

    if (event === "created") {
      console.log(`[created] ${parsed.session.id}`);
      return;
    }

    console.log(`[${event}] ${data}`);
  } catch {
    console.log(`[${event}] ${data}`);
  }
}
