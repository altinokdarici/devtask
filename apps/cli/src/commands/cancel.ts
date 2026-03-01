import { defineCommand } from "citty";
import { cancelSession } from "../api-client.ts";

export const cancelCommand = defineCommand({
  meta: { name: "cancel", description: "Cancel a session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID",
      required: true,
    },
  },
  async run({ args }) {
    const session = await cancelSession(args.id);
    console.log(`Session ${session.id} is now ${session.status}`);
  },
});
