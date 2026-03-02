import type { Session } from "@devtask/api-types";

export interface SessionStore {
  save(session: Session): Promise<void>;
  loadAll(): Promise<Session[]>;
}
