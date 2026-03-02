import type { SessionStatus } from "./session-status.ts";

export interface Session {
  id: string;
  brief: string;
  status: SessionStatus;
  provider: string;
  nodeId?: string;
  agentSessionId?: string;
  createdAt: string;
  updatedAt: string;
}
