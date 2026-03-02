import { defineCommand } from "citty";
import { projectCreateCommand } from "./create.ts";
import { projectListCommand } from "./list.ts";
import { projectShowCommand } from "./show.ts";
import { projectDeleteCommand } from "./delete.ts";

export const projectCommand = defineCommand({
  meta: { name: "project", description: "Manage projects" },
  subCommands: {
    create: projectCreateCommand,
    list: projectListCommand,
    show: projectShowCommand,
    delete: projectDeleteCommand,
  },
});
