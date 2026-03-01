export type SessionStatus =
  | "queued"
  | "provisioning"
  | "running"
  | "paused"
  | "done"
  | "failed"
  | "cancelled";

export interface Session {
  id: string;
  brief: string;
  status: SessionStatus;
  provider: string;
  nodeId?: string;
  agentSessionId?: string;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionBody {
  brief: string;
  provider?: string;
  maxRetries?: number;
}
