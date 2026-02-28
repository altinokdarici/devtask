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

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session not found: ${id}`);
    this.name = "SessionNotFoundError";
  }
}

export class InvalidTransitionError extends Error {
  constructor(id: string, from: SessionStatus, action: string) {
    super(`Cannot ${action} session ${id} in status ${from}`);
    this.name = "InvalidTransitionError";
  }
}
