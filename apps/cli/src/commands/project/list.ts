import { defineCommand } from "citty";
import { listProjects } from "../../api-client.ts";
import { formatProjectTable } from "../../output/table.ts";

export const projectListCommand = defineCommand({
  meta: { name: "list", description: "List all projects" },
  async run() {
    const projects = await listProjects();
    console.log(formatProjectTable(projects));
  },
});
