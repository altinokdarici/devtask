import type { CreatedSseEvent } from "./created-sse-event.ts";
import type { UpdatedSseEvent } from "./updated-sse-event.ts";
import type { AgentMessageSseEvent } from "./agent-message-sse-event.ts";

export type SessionSseEvent = CreatedSseEvent | UpdatedSseEvent | AgentMessageSseEvent;
