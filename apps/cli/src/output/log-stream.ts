import type {
  SseEventName,
  Session,
  CreatedSseEvent,
  UpdatedSseEvent,
  AgentMessageSseEvent,
} from "@devtask/api-types";

export function renderEvent(event: SseEventName, data: string): void {
  if (event === "ping") {
    return;
  }

  try {
    const parsed: unknown = JSON.parse(data);

    if (event === "snapshot") {
      const session = parsed as Session;
      console.log(`[session] ${session.status} — ${session.brief}`);
      return;
    }

    if (event === "agent_message") {
      const { message } = parsed as AgentMessageSseEvent;
      const msg = message as Record<string, unknown>;

      if (msg.type === "assistant") {
        const content = (msg.message as Record<string, unknown>)?.content;
        const blocks = (content as Array<Record<string, unknown>>) ?? [];
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
        const cost =
          msg.total_cost_usd != null ? ` ($${(msg.total_cost_usd as number).toFixed(4)})` : "";
        const duration =
          msg.duration_ms != null ? ` ${((msg.duration_ms as number) / 1000).toFixed(1)}s` : "";
        console.log(`[result] ${status}${duration}${cost}`);
        return;
      }

      if (msg.type === "system") {
        if (msg.subtype === "init") {
          console.log(`[system] model=${(msg.model as string) ?? "unknown"}`);
        }
        return;
      }

      // Other SDK message types: log type label
      console.log(`[${msg.type}]`);
      return;
    }

    if (event === "updated") {
      const { session } = parsed as UpdatedSseEvent;
      console.log(`[updated] ${session.status}`);
      if (session.status === "waiting_for_input") {
        console.log(
          `[info] Session is waiting for input. Use: devtask reply ${session.id} "<message>"`,
        );
      }
      return;
    }

    if (event === "created") {
      const { session } = parsed as CreatedSseEvent;
      console.log(`[created] ${session.id}`);
      return;
    }

    console.log(`[${event}] ${data}`);
  } catch {
    console.log(`[${event}] ${data}`);
  }
}
