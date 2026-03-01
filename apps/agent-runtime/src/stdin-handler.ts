import { createLineParser, decodeLine } from "@devtask/protocol";
import type { Command } from "@devtask/protocol";

export function listenForSignals(onCancel: () => void): void {
  const parse = createLineParser((line) => {
    try {
      const cmd = decodeLine(line) as Command;
      if (cmd.type === "signal" && cmd.action === "cancel") {
        onCancel();
      }
    } catch {
      // Skip malformed lines
    }
  });

  process.stdin.on("data", (chunk: Buffer) => {
    parse(chunk.toString());
  });

  // Don't let stdin keep the process alive after the agent finishes
  process.stdin.unref();
}
