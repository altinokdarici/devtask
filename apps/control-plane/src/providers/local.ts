import { spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import { encodeLine, createLineParser, decodeLine } from "@devtask/protocol";
import type { AgentMessage } from "@devtask/protocol";
import type { NodeProvider, NodeHandle, AgentProcess, NodeConfig } from "./provider.ts";

export function createLocalProvider(command: string, args: string[] = []): NodeProvider {
  return {
    async provision(_config: NodeConfig): Promise<NodeHandle> {
      const nodeId = crypto.randomUUID();
      let activeChild: ChildProcess | null = null;

      return {
        nodeId,

        start(taskBrief: string): AgentProcess {
          const child = spawn(command, [...args, taskBrief], {
            stdio: ["pipe", "pipe", "inherit"],
          });
          activeChild = child;

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

          child.stdout.on("data", (chunk: Buffer) => {
            parse(chunk.toString());
          });

          child.on("close", () => {
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
              if (!child.stdin.writable) return;
              child.stdin.write(encodeLine(command));
            },

            async kill() {
              child.kill();
            },
          };
        },

        async destroy() {
          if (activeChild) {
            activeChild.kill();
            activeChild = null;
          }
        },
      };
    },
  };
}
