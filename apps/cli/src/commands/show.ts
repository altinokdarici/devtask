import { defineCommand } from "citty";
import { getSession } from "../api-client.ts";

export const showCommand = defineCommand({
  meta: { name: "show", description: "Show session details" },
  args: {
    id: {
      type: "positional",
      description: "Session ID",
      required: true,
    },
  },
  async run({ args }) {
    const session = await getSession(args.id);
    console.log(JSON.stringify(session, null, 2));
  },
});
