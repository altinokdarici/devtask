export interface MessageStore {
  append(sessionId: string, message: unknown): Promise<void>;
  loadAll(sessionId: string): Promise<unknown[]>;
}
