import crypto from "node:crypto";
import {
  type Session,
  type SessionStatus,
  type CreateSessionBody,
  SessionNotFoundError,
  InvalidTransitionError,
} from "./types.ts";
import { saveSession, loadAllSessions } from "./session-store.ts";

export type SessionEvent =
  | { type: "created"; session: Session }
  | { type: "updated"; session: Session }
  | { type: "deleted"; sessionId: string };

type Listener = (event: SessionEvent) => void;

const VALID_TRANSITIONS: Record<string, SessionStatus[]> = {
  queued: ["provisioning", "cancelled"],
  provisioning: ["running", "failed", "cancelled"],
  running: ["paused", "done", "failed", "cancelled"],
  paused: ["running", "cancelled"],
};

export class SessionManager {
  private sessions = new Map<string, Session>();
  private listeners = new Map<string, Set<Listener>>();

  async init(): Promise<void> {
    const persisted = await loadAllSessions();
    for (const s of persisted) {
      this.sessions.set(s.id, s);
    }
  }

  async create(body: CreateSessionBody): Promise<Session> {
    const now = new Date().toISOString();
    const session: Session = {
      id: crypto.randomUUID(),
      brief: body.brief,
      status: "queued",
      provider: body.provider ?? "codespace",
      maxRetries: body.maxRetries ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    await saveSession(session);
    this.emit(session.id, { type: "created", session });
    return session;
  }

  list(): Session[] {
    return [...this.sessions.values()];
  }

  get(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) throw new SessionNotFoundError(id);
    return session;
  }

  async transition(id: string, to: SessionStatus): Promise<Session> {
    const session = this.get(id);
    const allowed = VALID_TRANSITIONS[session.status];
    if (!allowed || !allowed.includes(to)) {
      throw new InvalidTransitionError(id, session.status, to);
    }
    session.status = to;
    session.updatedAt = new Date().toISOString();
    await saveSession(session);
    this.emit(id, { type: "updated", session });
    return session;
  }

  async pause(id: string): Promise<Session> {
    return this.transition(id, "paused");
  }

  async resume(id: string): Promise<Session> {
    return this.transition(id, "running");
  }

  async cancel(id: string): Promise<Session> {
    return this.transition(id, "cancelled");
  }

  subscribe(id: string, listener: Listener): () => void {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(id);
    };
  }

  private emit(id: string, event: SessionEvent): void {
    const set = this.listeners.get(id);
    if (!set) return;
    for (const fn of set) {
      fn(event);
    }
  }
}
