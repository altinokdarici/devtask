export type SessionStatus =
  | "queued"
  | "provisioning"
  | "running"
  | "paused"
  | "waiting_for_input"
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

export interface ReplyBody {
  message: string;
}
