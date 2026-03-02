import crypto from "node:crypto";
import type {
  Session,
  SessionStatus,
  CreateSessionBody,
  CreatedSseEvent,
  UpdatedSseEvent,
} from "@devtask/api-types";
import type { SessionStore } from "./session-store.type.ts";
import type { MessageStore } from "./message-store.type.ts";
import { SessionNotFoundError } from "./session-not-found-error.ts";
import { InvalidTransitionError } from "./invalid-transition-error.ts";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

export type SessionEvent =
  | CreatedSseEvent
  | UpdatedSseEvent
  | { type: "deleted"; sessionId: string }
  | { type: "agent_message"; sessionId: string; message: SDKMessage };

type Listener = (event: SessionEvent) => void;

const VALID_TRANSITIONS: Record<string, SessionStatus[]> = {
  queued: ["provisioning", "cancelled"],
  provisioning: ["running", "failed", "cancelled"],
  running: ["waiting_for_input", "done", "failed", "cancelled"],
  waiting_for_input: ["running", "done", "cancelled"],
};

export class SessionManager {
  private sessions = new Map<string, Session>();
  private listeners = new Map<string, Set<Listener>>();
  private store: SessionStore;
  private messageStore: MessageStore;

  constructor(store: SessionStore, messageStore: MessageStore) {
    this.store = store;
    this.messageStore = messageStore;
  }

  async init(): Promise<void> {
    const persisted = await this.store.loadAll();
    for (const s of persisted) {
      this.sessions.set(s.id, s);
    }
  }

  async create(body: CreateSessionBody): Promise<Session> {
    const now = new Date().toISOString();
    const session: Session = {
      id: crypto.randomUUID(),
      projectId: body.projectId,
      brief: body.brief,
      status: "queued",
      provider: body.projectId,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    await this.store.save(session);
    this.emit(session.id, { type: "created", session });
    return session;
  }

  list(): Session[] {
    return [...this.sessions.values()];
  }

  get(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) {
      throw new SessionNotFoundError(id);
    }
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
    await this.store.save(session);
    this.emit(id, { type: "updated", session });
    return session;
  }

  async update(id: string, fields: { nodeId?: string; agentSessionId?: string }): Promise<Session> {
    const session = this.get(id);
    if (fields.nodeId !== undefined) {
      session.nodeId = fields.nodeId;
    }
    if (fields.agentSessionId !== undefined) {
      session.agentSessionId = fields.agentSessionId;
    }
    session.updatedAt = new Date().toISOString();
    await this.store.save(session);
    this.emit(id, { type: "updated", session });
    return session;
  }

  async cancel(id: string): Promise<Session> {
    return this.transition(id, "cancelled");
  }

  async waitForInput(id: string): Promise<Session> {
    return this.transition(id, "waiting_for_input");
  }

  async complete(id: string): Promise<Session> {
    return this.transition(id, "done");
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
      if (set!.size === 0) {
        this.listeners.delete(id);
      }
    };
  }

  async emitAgentMessage(sessionId: string, message: SDKMessage): Promise<void> {
    this.get(sessionId); // verify session exists
    await this.messageStore.append(sessionId, message);
    this.emit(sessionId, { type: "agent_message", sessionId, message });
  }

  async getMessages(sessionId: string): Promise<unknown[]> {
    this.get(sessionId); // verify session exists
    return this.messageStore.loadAll(sessionId);
  }

  private emit(id: string, event: SessionEvent): void {
    const set = this.listeners.get(id);
    if (set) {
      for (const fn of set) {
        fn(event);
      }
    }
    if (id !== "*") {
      const global = this.listeners.get("*");
      if (global) {
        for (const fn of global) {
          fn(event);
        }
      }
    }
  }
}
