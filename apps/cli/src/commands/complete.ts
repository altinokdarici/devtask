import { defineCommand } from "citty";
import { completeSession } from "../api-client.ts";

export const completeCommand = defineCommand({
  meta: { name: "complete", description: "Complete a waiting session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID",
      required: true,
    },
  },
  async run({ args }) {
    const session = await completeSession(args.id);
    console.log(`Session ${session.id} is now ${session.status}`);
  },
});
