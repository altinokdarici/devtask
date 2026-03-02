import { useState } from "react";
import Markdown from "react-markdown";
import type { SdkAssistantMessage, SdkContentBlock } from "../../lib/sdk-message-types.ts";
import { Badge } from "../ui/badge.tsx";

function groupContent(blocks: SdkContentBlock[]): SdkContentBlock[][] {
  const groups: SdkContentBlock[][] = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (last && last[0].type === block.type) {
      last.push(block);
    } else {
      groups.push([block]);
    }
  }
  return groups;
}

export function AssistantMessage({ message }: { message: SdkAssistantMessage }) {
  const groups = groupContent(message.content);

  return (
    <div className="space-y-2">
      {groups.map((group, gi) => {
        if (group[0].type === "text") {
          const combined = group.map((b) => (b.type === "text" ? b.text : "")).join("\n\n");
          return (
            <div key={gi} className="prose-sm text-foreground">
              <Markdown>{combined}</Markdown>
            </div>
          );
        }
        if (group[0].type === "tool_use") {
          return (
            <div key={gi} className="flex flex-wrap items-center gap-1.5">
              {group.map((b, i) =>
                b.type === "tool_use" ? (
                  <Badge key={i} variant="secondary" className="font-mono text-xs">
                    <span className="text-primary">{b.name}</span>
                  </Badge>
                ) : null,
              )}
            </div>
          );
        }
        if (group[0].type === "thinking") {
          return group.map((b, i) =>
            b.type === "thinking" ? <ThinkingBlock key={`${gi}-${i}`} text={b.thinking} /> : null,
          );
        }
        return null;
      })}
    </div>
  );
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
      >
        <span className="text-[10px]">{open ? "\u25BC" : "\u25B6"}</span>
        Thinking...
      </button>
      {open && (
        <pre className="mt-1 whitespace-pre-wrap text-muted-foreground/80 pl-3 border-l border-border">
          {text}
        </pre>
      )}
    </div>
  );
}
