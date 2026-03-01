import { defineCommand } from "citty";
import { streamEvents } from "../api-client.ts";
import { renderEvent } from "../output/log-stream.ts";

export const logsCommand = defineCommand({
  meta: { name: "logs", description: "Stream session events" },
  args: {
    id: {
      type: "positional",
      description: "Session ID",
      required: true,
    },
  },
  async run({ args }) {
    const ac = new AbortController();

    process.on("SIGINT", () => {
      ac.abort();
    });

    try {
      await streamEvents(args.id, renderEvent, ac.signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User pressed Ctrl+C
        return;
      }
      throw err;
    }
  },
});
