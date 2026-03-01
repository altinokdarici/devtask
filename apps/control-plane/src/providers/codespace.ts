import { spawn, type ChildProcess } from "node:child_process";
import { encodeLine, createLineParser, decodeLine } from "@devtask/protocol";
import type { AgentMessage } from "@devtask/protocol";
import type { NodeProvider, NodeHandle, AgentProcess, NodeConfig } from "./provider.ts";

export interface CodespaceConfig {
  repo: string;
  machine?: string;
  agentBundle?: string;
}

export function createCodespaceProvider(config: CodespaceConfig): NodeProvider {
  const machine = config.machine ?? "basicLinux32gb";
  const agentBundle = config.agentBundle ?? "./agent-runtime/dist/bundle.js";

  return {
    async provision(_config: NodeConfig): Promise<NodeHandle> {
      const child = spawn(
        "gh",
        ["cs", "create", "--repo", config.repo, "--machine", machine, "-d"],
        { stdio: ["ignore", "pipe", "inherit"] },
      );

      const output = await new Promise<string>((resolve, reject) => {
        let data = "";
        child.stdout.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        child.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`gh cs create exited with code ${code}`));
            return;
          }
          resolve(data);
        });
        child.on("error", reject);
      });

      const parsed = JSON.parse(output);
      const nodeId: string = parsed.name;

      let activeChild: ChildProcess | null = null;

      return {
        nodeId,

        start(taskBrief: string): AgentProcess {
          const ssh = spawn(
            "gh",
            ["cs", "ssh", "-c", nodeId, "--", "node", agentBundle, taskBrief],
            { stdio: ["pipe", "pipe", "inherit"] },
          );
          activeChild = ssh;

          const messageQueue: AgentMessage[] = [];
          let resolve: (() => void) | null = null;
          let done = false;

          const parse = createLineParser((line) => {
            try {
              const msg = decodeLine(line) as AgentMessage;
              messageQueue.push(msg);
              if (resolve) {
                resolve();
                resolve = null;
              }
            } catch {
              // Skip malformed lines
            }
          });

          ssh.stdout.on("data", (chunk: Buffer) => {
            parse(chunk.toString());
          });

          ssh.on("close", () => {
            done = true;
            activeChild = null;
            if (resolve) {
              resolve();
              resolve = null;
            }
          });

          const messages: AsyncIterable<AgentMessage> = {
            [Symbol.asyncIterator]() {
              return {
                async next(): Promise<IteratorResult<AgentMessage>> {
                  while (messageQueue.length === 0 && !done) {
                    await new Promise<void>((r) => {
                      resolve = r;
                    });
                  }
                  if (messageQueue.length > 0) {
                    return { value: messageQueue.shift()!, done: false };
                  }
                  return { value: undefined as never, done: true };
                },
              };
            },
          };

          return {
            messages,

            async signal(command) {
              if (!ssh.stdin.writable) return;
              ssh.stdin.write(encodeLine(command));
            },

            async kill() {
              ssh.kill();
            },
          };
        },

        async destroy() {
          if (activeChild) {
            activeChild.kill();
            activeChild = null;
          }

          const del = spawn("gh", ["cs", "delete", "-c", nodeId, "--force"], {
            stdio: ["ignore", "ignore", "inherit"],
          });

          await new Promise<void>((resolve, reject) => {
            del.on("close", (code) => {
              if (code !== 0) {
                reject(new Error(`gh cs delete exited with code ${code}`));
                return;
              }
              resolve();
            });
            del.on("error", reject);
          });
        },
      };
    },
  };
}
