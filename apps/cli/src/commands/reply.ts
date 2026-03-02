import { defineCommand } from "citty";
import { replyToSession } from "../api-client.ts";

export const replyCommand = defineCommand({
  meta: { name: "reply", description: "Send a follow-up message to a waiting session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID",
      required: true,
    },
    message: {
      type: "positional",
      description: "Reply message",
      required: true,
    },
  },
  async run({ args }) {
    const session = await replyToSession(args.id, args.message);
    console.log(`Session ${session.id} is now ${session.status}`);
  },
});
