import { useMemo } from "react";
import type { AgentMessageSseEvent } from "@devtask/api-types";
import { classifySdkMessage } from "../lib/classify-sdk-message.ts";
import type { ClassifiedMessage, SdkToolUseBlock } from "../lib/sdk-message-types.ts";
import { useAutoScroll } from "../hooks/use-auto-scroll.ts";
import { AssistantMessage } from "./messages/assistant-message.tsx";
import { UserMessage } from "./messages/user-message.tsx";
import { SystemInitMessage } from "./messages/system-init-message.tsx";
import { ToolProgressMessage } from "./messages/tool-progress-message.tsx";
import { ResultMessage } from "./messages/result-message.tsx";
import { TaskMessage } from "./messages/task-message.tsx";
import { FallbackMessage } from "./messages/fallback-message.tsx";
import { ToolCallGroup } from "./messages/tool-call-group.tsx";

type FeedItem =
  | { type: "message"; classified: ClassifiedMessage }
  | { type: "tool-group"; tools: SdkToolUseBlock[] };

function isToolOnlyAssistant(msg: ClassifiedMessage): SdkToolUseBlock[] | null {
  if (msg.kind !== "assistant") {
    return null;
  }
  const toolBlocks = msg.content.filter((b) => b.type === "tool_use");
  const hasText = msg.content.some((b) => b.type === "text" && b.text.trim().length > 0);
  if (!hasText && toolBlocks.length > 0) {
    return toolBlocks as SdkToolUseBlock[];
  }
  return null;
}

/** Messages that get absorbed into an adjacent tool group (not shown independently). */
function isToolGroupNoise(msg: ClassifiedMessage): boolean {
  return msg.kind === "tool-result" || msg.kind === "tool-progress";
}

function buildFeedItems(messages: AgentMessageSseEvent[]): FeedItem[] {
  const items: FeedItem[] = [];
  let pendingTools: SdkToolUseBlock[] = [];

  for (const event of messages) {
    const classified = classifySdkMessage(event.message);
    const toolBlocks = isToolOnlyAssistant(classified);

    if (toolBlocks) {
      pendingTools.push(...toolBlocks);
    } else if (pendingTools.length > 0 && isToolGroupNoise(classified)) {
      // Absorb tool results and progress into the current tool group
    } else {
      if (pendingTools.length > 0) {
        items.push({ type: "tool-group", tools: pendingTools });
        pendingTools = [];
      }
      // Skip empty user messages (tool results outside a tool group)
      if (classified.kind === "tool-result") {
        continue;
      }
      items.push({ type: "message", classified });
    }
  }

  if (pendingTools.length > 0) {
    items.push({ type: "tool-group", tools: pendingTools });
  }

  return items;
}

export function MessageFeed({ messages }: { messages: AgentMessageSseEvent[] }) {
  const { containerRef } = useAutoScroll([messages.length]);
  const items = useMemo(() => buildFeedItems(messages), [messages]);

  if (messages.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center"
      >
        <p className="text-muted-foreground text-sm">No agent messages yet.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto min-h-0 space-y-3 p-4 font-mono">
      {items.map((item, i) => {
        if (item.type === "tool-group") {
          return (
            <div key={i} className="animate-fade-in">
              <ToolCallGroup tools={item.tools} />
            </div>
          );
        }

        const { classified } = item;
        return (
          <div key={i} className="animate-fade-in">
            {classified.kind === "assistant" && <AssistantMessage message={classified} />}
            {classified.kind === "user" && <UserMessage message={classified} />}
            {classified.kind === "system-init" && <SystemInitMessage message={classified} />}
            {classified.kind === "tool-progress" && <ToolProgressMessage message={classified} />}
            {classified.kind === "result" && <ResultMessage message={classified} />}
            {classified.kind === "task" && <TaskMessage message={classified} />}
            {classified.kind === "unknown" && <FallbackMessage message={classified} />}
          </div>
        );
      })}
    </div>
  );
}
