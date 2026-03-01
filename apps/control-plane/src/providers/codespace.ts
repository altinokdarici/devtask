import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { NodeProvider, NodeHandle, NodeConfig } from "./provider.ts";

const execFileAsync = promisify(execFile);

export interface CodespaceProviderConfig {
  repo: string;
  machine?: string;
}

export function createCodespaceProvider(config: CodespaceProviderConfig): NodeProvider {
  return {
    async provision(nodeConfig: NodeConfig): Promise<NodeHandle> {
      const machineArgs = config.machine ? ["--machine", config.machine] : [];

      const { stdout } = await execFileAsync("gh", [
        "cs",
        "create",
        "--repo",
        config.repo,
        ...machineArgs,
        "--display-name",
        `devtask-${nodeConfig.sessionId.slice(0, 8)}`,
        "--default-permissions",
      ]);
      const codespaceName = stdout.trim();

      // Wait for the codespace to be available
      await execFileAsync("gh", ["cs", "ssh", "-c", codespaceName, "--", "echo", "ready"]);

      return {
        nodeId: codespaceName,

        spawnFn(options) {
          // Wrap gh cs ssh as a SpawnedProcess.
          // The SDK passes command + args it wants to run remotely.
          // We route them through the SSH tunnel.
          const remoteCommand = [options.command, ...options.args]
            .map((arg) => `'${arg.replace(/'/g, "'\\''")}'`)
            .join(" ");

          return spawn("gh", ["cs", "ssh", "-c", codespaceName, "--", remoteCommand], {
            env: options.env as NodeJS.ProcessEnv,
            signal: options.signal,
            stdio: ["pipe", "pipe", "pipe"],
          });
        },

        async destroy() {
          try {
            await execFileAsync("gh", ["cs", "delete", "-c", codespaceName, "--force"]);
          } catch {
            // Codespace may already be deleted
          }
        },
      };
    },
  };
}
