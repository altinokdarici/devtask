import { defineCommand } from "citty";
import { pauseSession } from "../api-client.ts";

export const pauseCommand = defineCommand({
  meta: { name: "pause", description: "Pause a running session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID",
      required: true,
    },
  },
  async run({ args }) {
    const session = await pauseSession(args.id);
    console.log(`Session ${session.id} is now ${session.status}`);
  },
});
