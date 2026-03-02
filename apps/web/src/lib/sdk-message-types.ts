export interface SdkTextBlock {
  type: "text";
  text: string;
}

export interface SdkToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface SdkThinkingBlock {
  type: "thinking";
  thinking: string;
}

export type SdkContentBlock = SdkTextBlock | SdkToolUseBlock | SdkThinkingBlock;

export interface SdkAssistantMessage {
  kind: "assistant";
  content: SdkContentBlock[];
}

export interface SdkUserMessage {
  kind: "user";
  content: string;
}

export interface SdkSystemInitMessage {
  kind: "system-init";
  model: string;
  cwd: string;
  tools: string[];
}

export interface SdkToolProgressMessage {
  kind: "tool-progress";
  toolName: string;
  elapsedTimeSeconds: number;
}

export interface SdkResultMessage {
  kind: "result";
  subtype: string;
  durationMs: number;
  totalCostUsd: number;
  isError: boolean;
  errors: string[];
}

export interface SdkTaskMessage {
  kind: "task";
  subtype: string;
  description: string;
  status: string;
}

export interface SdkToolResultMessage {
  kind: "tool-result";
}

export interface SdkUnknownMessage {
  kind: "unknown";
  type: string;
  raw: unknown;
}

export type ClassifiedMessage =
  | SdkAssistantMessage
  | SdkUserMessage
  | SdkSystemInitMessage
  | SdkToolProgressMessage
  | SdkResultMessage
  | SdkTaskMessage
  | SdkToolResultMessage
  | SdkUnknownMessage;
