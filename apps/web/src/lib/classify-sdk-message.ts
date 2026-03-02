import type { ClassifiedMessage, SdkContentBlock } from "./sdk-message-types.ts";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isContentBlock(v: unknown): v is SdkContentBlock {
  if (!isObject(v) || typeof v.type !== "string") {
    return false;
  }
  return v.type === "text" || v.type === "tool_use" || v.type === "thinking";
}

export function classifySdkMessage(raw: unknown): ClassifiedMessage {
  if (!isObject(raw) || typeof raw.type !== "string") {
    return { kind: "unknown", type: "invalid", raw };
  }

  if (raw.type === "assistant" && isObject(raw.message)) {
    const msg = raw.message;
    const content = Array.isArray(msg.content) ? msg.content.filter(isContentBlock) : [];
    return { kind: "assistant", content };
  }

  if (raw.type === "user" && isObject(raw.message)) {
    const msg = raw.message;

    // Detect tool_result messages — these are automatic SDK responses, not human input
    if (Array.isArray(msg.content)) {
      const hasToolResult = msg.content.some(
        (b: unknown) => isObject(b) && b.type === "tool_result",
      );
      const hasHumanText = msg.content.some(
        (b: unknown) => isObject(b) && b.type === "text" && typeof b.text === "string",
      );
      if (hasToolResult && !hasHumanText) {
        return { kind: "tool-result" };
      }
    }

    const content =
      typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content
              .filter(
                (b: unknown) => isObject(b) && b.type === "text" && typeof b.text === "string",
              )
              .map((b: Record<string, unknown>) => b.text as string)
              .join("\n")
          : JSON.stringify(msg.content);
    return { kind: "user", content };
  }

  if (raw.type === "system" && raw.subtype === "init") {
    return {
      kind: "system-init",
      model: typeof raw.model === "string" ? raw.model : "unknown",
      cwd: typeof raw.cwd === "string" ? raw.cwd : "",
      tools: Array.isArray(raw.tools)
        ? raw.tools.filter((t: unknown) => typeof t === "string")
        : [],
    };
  }

  if (raw.type === "tool_progress") {
    return {
      kind: "tool-progress",
      toolName: typeof raw.tool_name === "string" ? raw.tool_name : "unknown",
      elapsedTimeSeconds:
        typeof raw.elapsed_time_seconds === "number" ? raw.elapsed_time_seconds : 0,
    };
  }

  if (raw.type === "result") {
    return {
      kind: "result",
      subtype: typeof raw.subtype === "string" ? raw.subtype : "",
      durationMs: typeof raw.duration_ms === "number" ? raw.duration_ms : 0,
      totalCostUsd: typeof raw.total_cost_usd === "number" ? raw.total_cost_usd : 0,
      isError: raw.is_error === true,
      errors: Array.isArray(raw.errors)
        ? raw.errors.filter((e: unknown) => typeof e === "string")
        : [],
    };
  }

  if (
    raw.type === "task_started" ||
    raw.type === "task_progress" ||
    raw.type === "task_notification"
  ) {
    return {
      kind: "task",
      subtype: raw.type,
      description: typeof raw.description === "string" ? raw.description : "",
      status: typeof raw.status === "string" ? raw.status : "",
    };
  }

  return { kind: "unknown", type: raw.type, raw };
}
