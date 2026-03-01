import { defineCommand } from "citty";
import { resumeSession } from "../api-client.ts";

export const resumeCommand = defineCommand({
  meta: { name: "resume", description: "Resume a paused session" },
  args: {
    id: {
      type: "positional",
      description: "Session ID",
      required: true,
    },
  },
  async run({ args }) {
    const session = await resumeSession(args.id);
    console.log(`Session ${session.id} is now ${session.status}`);
  },
});
