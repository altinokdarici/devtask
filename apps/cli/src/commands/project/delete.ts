import { defineCommand } from "citty";
import { deleteProject } from "../../api-client.ts";

export const projectDeleteCommand = defineCommand({
  meta: { name: "delete", description: "Delete a project" },
  args: {
    id: {
      type: "string",
      description: "Project ID",
      required: true,
    },
  },
  async run({ args }) {
    await deleteProject(args.id);
    console.log(`Deleted project ${args.id}`);
  },
});
