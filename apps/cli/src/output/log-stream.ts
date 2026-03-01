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
      if (msg.type === "status") {
        console.log(`[status] ${msg.status}`);
      } else if (msg.type === "log") {
        console.log(`[log] ${msg.text}`);
      } else if (msg.type === "question") {
        console.log(`[question] ${msg.text}`);
        if (msg.options) {
          console.log(`  options: ${msg.options.join(", ")}`);
        }
      }
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
