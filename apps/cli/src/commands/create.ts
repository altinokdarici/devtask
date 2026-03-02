import { defineCommand } from "citty";
import { createSession } from "../api-client.ts";

export const createCommand = defineCommand({
  meta: { name: "create", description: "Create a new session" },
  args: {
    brief: {
      type: "string",
      description: "Task brief for the agent",
      required: true,
    },
    project: {
      type: "string",
      description: "Project ID",
      required: true,
    },
  },
  async run({ args }) {
    const session = await createSession({
      brief: args.brief,
      projectId: args.project,
    });
    console.log(`Created session ${session.id} (${session.status})`);
  },
});
