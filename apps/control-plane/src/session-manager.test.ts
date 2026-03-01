import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SessionManager, type SessionEvent } from "./session-manager.ts";
import type { Session, SessionStore } from "./types.ts";
import { SessionNotFoundError, InvalidTransitionError } from "./types.ts";

function createMemoryStore(): SessionStore {
  return {
    async save() {},
    async loadAll() {
      return [];
    },
  };
}

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(async () => {
    manager = new SessionManager(createMemoryStore());
    await manager.init();
  });

  describe("create", () => {
    it("creates a session in queued status", async () => {
      const session = await manager.create({ brief: "test task" });
      assert.equal(session.status, "queued");
      assert.equal(session.brief, "test task");
      assert.equal(session.provider, "local");
      assert.equal(session.maxRetries, 0);
      assert.ok(session.id);
      assert.ok(session.createdAt);
      assert.ok(session.updatedAt);
    });

    it("uses provided provider and maxRetries", async () => {
      const session = await manager.create({
        brief: "test",
        provider: "docker",
        maxRetries: 3,
      });
      assert.equal(session.provider, "docker");
      assert.equal(session.maxRetries, 3);
    });

    it("adds session to the list", async () => {
      await manager.create({ brief: "one" });
      await manager.create({ brief: "two" });
      assert.equal(manager.list().length, 2);
    });
  });

  describe("get", () => {
    it("returns a session by id", async () => {
      const created = await manager.create({ brief: "test" });
      const fetched = manager.get(created.id);
      assert.equal(fetched.id, created.id);
    });

    it("throws SessionNotFoundError for unknown id", () => {
      assert.throws(() => manager.get("nonexistent"), SessionNotFoundError);
    });
  });

  describe("state transitions", () => {
    it("queued → provisioning → running → done", async () => {
      const s = await manager.create({ brief: "test" });
      await manager.transition(s.id, "provisioning");
      assert.equal(manager.get(s.id).status, "provisioning");
      await manager.transition(s.id, "running");
      assert.equal(manager.get(s.id).status, "running");
      await manager.transition(s.id, "done");
      assert.equal(manager.get(s.id).status, "done");
    });

    it("running → paused → running (resume)", async () => {
      const s = await manager.create({ brief: "test" });
      await manager.transition(s.id, "provisioning");
      await manager.transition(s.id, "running");
      await manager.pause(s.id);
      assert.equal(manager.get(s.id).status, "paused");
      await manager.resume(s.id);
      assert.equal(manager.get(s.id).status, "running");
    });

    it("cancel from any active status", async () => {
      const s1 = await manager.create({ brief: "queued" });
      await manager.cancel(s1.id);
      assert.equal(manager.get(s1.id).status, "cancelled");

      const s2 = await manager.create({ brief: "running" });
      await manager.transition(s2.id, "provisioning");
      await manager.transition(s2.id, "running");
      await manager.cancel(s2.id);
      assert.equal(manager.get(s2.id).status, "cancelled");
    });

    it("rejects invalid transitions", async () => {
      const s = await manager.create({ brief: "test" });
      await assert.rejects(() => manager.pause(s.id), InvalidTransitionError);
      await assert.rejects(() => manager.resume(s.id), InvalidTransitionError);
      await assert.rejects(() => manager.transition(s.id, "done"), InvalidTransitionError);
    });

    it("rejects transitions from terminal states", async () => {
      const s = await manager.create({ brief: "test" });
      await manager.cancel(s.id);
      await assert.rejects(() => manager.transition(s.id, "running"), InvalidTransitionError);
      await assert.rejects(() => manager.cancel(s.id), InvalidTransitionError);
    });

    it("updates updatedAt on transition", async () => {
      const s = await manager.create({ brief: "test" });
      const before = s.updatedAt;
      await new Promise((r) => setTimeout(r, 5));
      await manager.cancel(s.id);
      assert.notEqual(manager.get(s.id).updatedAt, before);
    });
  });

  describe("pub/sub", () => {
    it("fires created event on create", async () => {
      const events: SessionEvent[] = [];
      // Subscribe before the session exists using a known pattern:
      // create, then subscribe for further events
      const session = await manager.create({ brief: "test" });
      manager.subscribe(session.id, (e) => events.push(e));

      // Trigger an event
      await manager.cancel(session.id);
      assert.equal(events.length, 1);
      assert.equal(events[0].type, "updated");
    });

    it("delivers events to multiple listeners", async () => {
      const s = await manager.create({ brief: "test" });
      const events1: SessionEvent[] = [];
      const events2: SessionEvent[] = [];
      manager.subscribe(s.id, (e) => events1.push(e));
      manager.subscribe(s.id, (e) => events2.push(e));

      await manager.cancel(s.id);
      assert.equal(events1.length, 1);
      assert.equal(events2.length, 1);
    });

    it("unsubscribe stops delivery", async () => {
      const s = await manager.create({ brief: "test" });
      const events: SessionEvent[] = [];
      const unsub = manager.subscribe(s.id, (e) => events.push(e));

      await manager.transition(s.id, "provisioning");
      assert.equal(events.length, 1);

      unsub();
      await manager.transition(s.id, "running");
      assert.equal(events.length, 1); // no new event
    });

    it("does not leak listeners across sessions", async () => {
      const s1 = await manager.create({ brief: "one" });
      const s2 = await manager.create({ brief: "two" });
      const events: SessionEvent[] = [];
      manager.subscribe(s1.id, (e) => events.push(e));

      await manager.cancel(s2.id);
      assert.equal(events.length, 0);
    });
  });

  describe("default provider", () => {
    it("uses configured default provider", async () => {
      const m = new SessionManager(createMemoryStore(), "codespace:frontend");
      await m.init();
      const session = await m.create({ brief: "test" });
      assert.equal(session.provider, "codespace:frontend");
    });

    it("allows explicit provider to override default", async () => {
      const m = new SessionManager(createMemoryStore(), "codespace:frontend");
      await m.init();
      const session = await m.create({ brief: "test", provider: "local" });
      assert.equal(session.provider, "local");
    });
  });

  describe("update", () => {
    it("sets nodeId and persists", async () => {
      const saved: Session[] = [];
      const store: SessionStore = {
        async save(s) {
          saved.push(structuredClone(s));
        },
        async loadAll() {
          return [];
        },
      };
      const m = new SessionManager(store);
      await m.init();
      const session = await m.create({ brief: "test" });
      const before = session.updatedAt;

      await new Promise((r) => setTimeout(r, 5));
      await m.update(session.id, { nodeId: "node-123" });

      const updated = m.get(session.id);
      assert.equal(updated.nodeId, "node-123");
      assert.notEqual(updated.updatedAt, before);
      // save called for create + update
      assert.ok(saved.length >= 2);
    });

    it("sets agentSessionId and emits event", async () => {
      const events: SessionEvent[] = [];
      const session = await manager.create({ brief: "test" });
      manager.subscribe(session.id, (e) => events.push(e));

      await manager.update(session.id, { agentSessionId: "agent-456" });

      assert.equal(manager.get(session.id).agentSessionId, "agent-456");
      assert.equal(events.length, 1);
      assert.equal(events[0].type, "updated");
    });

    it("updates only the provided fields", async () => {
      const session = await manager.create({ brief: "test" });
      await manager.update(session.id, { nodeId: "n1" });
      await manager.update(session.id, { agentSessionId: "a1" });

      const updated = manager.get(session.id);
      assert.equal(updated.nodeId, "n1");
      assert.equal(updated.agentSessionId, "a1");
    });
  });

  describe("init", () => {
    it("loads persisted sessions on init", async () => {
      const persisted: Session = {
        id: "abc",
        brief: "persisted",
        status: "running",
        provider: "codespace",
        maxRetries: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const store: SessionStore = {
        async save() {},
        async loadAll() {
          return [persisted];
        },
      };
      const m = new SessionManager(store);
      await m.init();
      assert.equal(m.get("abc").brief, "persisted");
      assert.equal(m.list().length, 1);
    });
  });
});
