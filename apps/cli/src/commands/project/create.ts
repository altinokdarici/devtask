import { defineCommand } from "citty";
import { createProject } from "../../api-client.ts";
import type { ProjectProvider } from "@devtask/api-types";

export const projectCreateCommand = defineCommand({
  meta: { name: "create", description: "Create a new project" },
  args: {
    name: {
      type: "string",
      description: "Project name",
      required: true,
    },
    provider: {
      type: "string",
      description: "Provider type (local or codespace)",
      required: true,
    },
    "work-dir": {
      type: "string",
      description: "Working directory (local provider)",
    },
    "repo-url": {
      type: "string",
      description: "Repository URL (local provider, optional)",
    },
    repo: {
      type: "string",
      description: "GitHub repo owner/name (codespace provider)",
    },
    machine: {
      type: "string",
      description: "Machine type (codespace provider, optional)",
    },
  },
  async run({ args }) {
    let provider: ProjectProvider;
    if (args.provider === "local") {
      if (!args["work-dir"]) {
        console.error("--work-dir is required for local provider");
        process.exit(1);
      }
      provider = {
        type: "local",
        workDir: args["work-dir"],
        repoUrl: args["repo-url"] || undefined,
      };
    } else if (args.provider === "codespace") {
      if (!args.repo) {
        console.error("--repo is required for codespace provider");
        process.exit(1);
      }
      provider = {
        type: "codespace",
        repo: args.repo,
        machine: args.machine || undefined,
      };
    } else {
      console.error(`Unknown provider type: ${args.provider}`);
      process.exit(1);
    }

    const project = await createProject({ name: args.name, provider });
    console.log(`Created project ${project.id} (${project.name})`);
  },
});
