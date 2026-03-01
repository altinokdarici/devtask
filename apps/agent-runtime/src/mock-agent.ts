import { encodeLine } from "@devtask/protocol";
import type { AgentMessage } from "@devtask/protocol";

function emit(msg: AgentMessage): void {
  process.stdout.write(encodeLine(msg));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runMockAgent(brief: string): Promise<void> {
  emit({ type: "status", status: "running" });

  emit({ type: "log", text: `Received task: ${brief}` });
  await delay(100);

  emit({ type: "log", text: "Analyzing codebase..." });
  await delay(100);

  emit({ type: "log", text: "Making changes..." });
  await delay(100);

  emit({ type: "log", text: "Task complete." });
  emit({ type: "status", status: "done" });
}
