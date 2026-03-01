import { spawn } from "node:child_process";
import crypto from "node:crypto";
import type { NodeProvider, NodeHandle, NodeConfig } from "./provider.ts";

export function createLocalProvider(): NodeProvider {
  return {
    async provision(_config: NodeConfig): Promise<NodeHandle> {
      const nodeId = crypto.randomUUID();

      return {
        nodeId,

        spawnFn(options) {
          return spawn(options.command, options.args, {
            cwd: options.cwd,
            env: options.env as NodeJS.ProcessEnv,
            signal: options.signal,
            stdio: ["pipe", "pipe", "pipe"],
          });
        },

        async destroy() {},
      };
    },
  };
}
