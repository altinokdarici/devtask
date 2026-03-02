import type { ProjectProvider } from "@devtask/api-types";
import type { NodeProvider } from "./provider.ts";
import { createLocalProvider } from "./local.ts";
import { createCodespaceProvider } from "./codespace.ts";

export function createProviderFromProject(provider: ProjectProvider): NodeProvider {
  switch (provider.type) {
    case "local":
      return createLocalProvider({ workDir: provider.workDir });
    case "codespace":
      return createCodespaceProvider({
        repo: provider.repo,
        machine: provider.machine,
      });
  }
}
