import { useState } from "react";
import type { SdkToolUseBlock } from "../../lib/sdk-message-types.ts";
import { Badge } from "../ui/badge.tsx";

function summarizeInput(name: string, input: unknown): string {
  if (typeof input !== "object" || input === null) {
    return "";
  }
  const obj = input as Record<string, unknown>;

  if (name === "Read" && typeof obj.file_path === "string") {
    return obj.file_path;
  }
  if (name === "Bash" && typeof obj.command === "string") {
    const cmd = obj.command;
    return cmd.length > 120 ? cmd.slice(0, 120) + "..." : cmd;
  }
  if (name === "Grep" && typeof obj.pattern === "string") {
    return `/${obj.pattern}/` + (typeof obj.path === "string" ? ` in ${obj.path}` : "");
  }
  if (name === "Glob" && typeof obj.pattern === "string") {
    return obj.pattern + (typeof obj.path === "string" ? ` in ${obj.path}` : "");
  }
  if (name === "Write" && typeof obj.file_path === "string") {
    return obj.file_path;
  }
  if (name === "Edit" && typeof obj.file_path === "string") {
    return obj.file_path;
  }
  if (name === "Task" && typeof obj.description === "string") {
    return obj.description;
  }
  return "";
}

function countByName(tools: SdkToolUseBlock[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tools) {
    counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
  }
  return counts;
}

export function ToolCallGroup({ tools }: { tools: SdkToolUseBlock[] }) {
  const [open, setOpen] = useState(false);
  const counts = countByName(tools);

  const summary = Array.from(counts.entries())
    .map(([name, count]) => (count > 1 ? `${name}(${count})` : name))
    .join(" ");

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <span className="text-[10px]">{open ? "\u25BC" : "\u25B6"}</span>
        <span>
          {tools.length} tool {tools.length === 1 ? "call" : "calls"}
        </span>
        <span className="text-muted-foreground/60">{summary}</span>
      </button>
      {open && (
        <div className="mt-1.5 space-y-1 pl-4 border-l border-border">
          {tools.map((tool, i) => {
            const detail = summarizeInput(tool.name, tool.input);
            return (
              <div key={i} className="flex items-baseline gap-2">
                <Badge variant="secondary" className="font-mono text-[11px] shrink-0">
                  <span className="text-primary">{tool.name}</span>
                </Badge>
                {detail && (
                  <span className="text-muted-foreground truncate text-[11px]">{detail}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
