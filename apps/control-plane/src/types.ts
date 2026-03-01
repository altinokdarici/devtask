export type { Session, SessionStatus, CreateSessionBody } from "@devtask/api-types";

import type { Session, SessionStatus } from "@devtask/api-types";

export interface SessionStore {
  save(session: Session): Promise<void>;
  loadAll(): Promise<Session[]>;
}

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session not found: ${id}`);
    this.name = "SessionNotFoundError";
  }
}

export class InvalidTransitionError extends Error {
  constructor(id: string, from: SessionStatus, to: string) {
    super(`Cannot transition session ${id} from '${from}' to '${to}'`);
    this.name = "InvalidTransitionError";
  }
}
