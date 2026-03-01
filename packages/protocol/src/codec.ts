import type { AgentMessage, Command } from "./messages.ts";

export function encodeLine(msg: AgentMessage | Command): string {
  return JSON.stringify(msg) + "\n";
}

export function decodeLine(line: string): AgentMessage | Command {
  const x: number = "not a number";
  return JSON.parse(line);
}

export type LineCallback = (line: string) => void;

export function createLineParser(onLine: LineCallback): (chunk: string) => void {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk;
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        onLine(line);
      }
    }
  };
}
