import { defineCommand } from "citty";
import { getProject } from "../../api-client.ts";

export const projectShowCommand = defineCommand({
  meta: { name: "show", description: "Show project details" },
  args: {
    id: {
      type: "string",
      description: "Project ID",
      required: true,
    },
  },
  async run({ args }) {
    const project = await getProject(args.id);
    console.log(JSON.stringify(project, null, 2));
  },
});
