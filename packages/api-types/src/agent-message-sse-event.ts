export interface AgentMessageSseEvent {
  type: "agent_message";
  sessionId: string;
  message: unknown;
}
