import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SessionManager, type SessionEvent } from "./session-manager.ts";
import { Dispatcher } from "./dispatcher.ts";
import type { NodeProvider, NodeHandle, AgentProcess } from "./providers/provider.ts";
import type { AgentMessage, Command } from "./protocol/messages.ts";
import type { SessionStore } from "./types.ts";

function createMemoryStore(): SessionStore {
  return {
    async save() {},
    async loadAll() {
      return [];
    },
  };
}

interface MockProviderOptions {
  messages: AgentMessage[];
  keepAlive?: boolean;
}

function createMockProvider(
  opts: MockProviderOptions,
): NodeProvider & { signals: Command[]; killed: boolean } {
  const signals: Command[] = [];
  const result = {
    signals,
    killed: false,
    async provision() {
      return {
        nodeId: "mock-node-1",
        start(_brief: string): AgentProcess {
          let index = 0;
          let hangResolve: (() => void) | null = null;

          const asyncMessages: AsyncIterable<AgentMessage> = {
            [Symbol.asyncIterator]() {
              return {
                async next(): Promise<IteratorResult<AgentMessage>> {
                  if (index < opts.messages.length) {
                    await new Promise((r) => setTimeout(r, 1));
                    return { value: opts.messages[index++]!, done: false };
                  }
                  if (opts.keepAlive) {
                    // Block until killed
                    await new Promise<void>((r) => {
                      hangResolve = r;
                    });
                  }
                  return { value: undefined as never, done: true };
                },
              };
            },
          };

          return {
            messages: asyncMessages,
            async signal(command: Command) {
              signals.push(command);
            },
            async kill() {
              result.killed = true;
              if (hangResolve) {
                hangResolve();
                hangResolve = null;
              }
            },
          };
        },
        async destroy() {},
      } as NodeHandle;
    },
  };
  return result;
}

describe("Dispatcher", () => {
  let manager: SessionManager;

  beforeEach(async () => {
    manager = new SessionManager(createMemoryStore());
    await manager.init();
  });

  it("dispatches a queued session through provisioning → running → done", async () => {
    const mockProvider = createMockProvider({
      messages: [
        { type: "status", status: "running" },
        { type: "log", text: "working..." },
        { type: "status", status: "done" },
      ],
    });

    const dispatcher = new Dispatcher(manager, mockProvider);
    dispatcher.start();

    const session = await manager.create({ brief: "test task" });

    await new Promise((r) => setTimeout(r, 50));

    const updated = manager.get(session.id);
    assert.equal(updated.status, "done");
  });

  it("transitions to failed when agent reports failure", async () => {
    const mockProvider = createMockProvider({
      messages: [
        { type: "status", status: "running" },
        { type: "status", status: "failed" },
      ],
    });

    const dispatcher = new Dispatcher(manager, mockProvider);
    dispatcher.start();

    const session = await manager.create({ brief: "failing task" });

    await new Promise((r) => setTimeout(r, 50));

    const updated = manager.get(session.id);
    assert.equal(updated.status, "failed");
  });

  it("relays agent messages through pub/sub", async () => {
    const mockProvider = createMockProvider({
      messages: [
        { type: "log", text: "hello from agent" },
        { type: "question", id: "q1", text: "pick one", options: ["a", "b"] },
        { type: "status", status: "done" },
      ],
    });

    const dispatcher = new Dispatcher(manager, mockProvider);
    dispatcher.start();

    const session = await manager.create({ brief: "test" });
    const agentMessages: AgentMessage[] = [];
    manager.subscribe(session.id, (event) => {
      if (event.type === "agent_message") {
        agentMessages.push(event.message);
      }
    });

    await new Promise((r) => setTimeout(r, 50));

    assert.equal(agentMessages.length, 3);
    assert.deepEqual(agentMessages[0], { type: "log", text: "hello from agent" });
    assert.deepEqual(agentMessages[1], {
      type: "question",
      id: "q1",
      text: "pick one",
      options: ["a", "b"],
    });
    assert.deepEqual(agentMessages[2], { type: "status", status: "done" });
  });

  it("forwards signals to the agent process", async () => {
    const mockProvider = createMockProvider({
      messages: [{ type: "status", status: "running" }],
      keepAlive: true,
    });

    const dispatcher = new Dispatcher(manager, mockProvider);
    dispatcher.start();

    const session = await manager.create({ brief: "interactive task" });

    await new Promise((r) => setTimeout(r, 50));

    await dispatcher.signal(session.id, {
      type: "answer",
      questionId: "q1",
      value: "vitest",
    });

    assert.equal(mockProvider.signals.length, 1);
    assert.deepEqual(mockProvider.signals[0], {
      type: "answer",
      questionId: "q1",
      value: "vitest",
    });

    // Clean up: cancel to unblock the hanging iterator
    await dispatcher.cancel(session.id);
  });

  it("cancel kills the process and transitions to cancelled", async () => {
    const mockProvider = createMockProvider({
      messages: [{ type: "status", status: "running" }],
      keepAlive: true,
    });

    const dispatcher = new Dispatcher(manager, mockProvider);
    dispatcher.start();

    const session = await manager.create({ brief: "cancel me" });

    await new Promise((r) => setTimeout(r, 50));

    assert.equal(manager.get(session.id).status, "running");

    await dispatcher.cancel(session.id);

    assert.equal(manager.get(session.id).status, "cancelled");
    assert.equal(mockProvider.killed, true);
  });

  it("handles provision failure gracefully", async () => {
    const failingProvider: NodeProvider = {
      async provision() {
        throw new Error("provision failed");
      },
    };

    const dispatcher = new Dispatcher(manager, failingProvider);
    dispatcher.start();

    const session = await manager.create({ brief: "doomed" });

    await new Promise((r) => setTimeout(r, 50));

    assert.equal(manager.get(session.id).status, "failed");
  });

  it("wildcard subscriber receives events for all sessions", async () => {
    const events: SessionEvent[] = [];
    manager.subscribe("*", (e) => events.push(e));

    await manager.create({ brief: "one" });
    await manager.create({ brief: "two" });

    assert.equal(events.length, 2);
    assert.equal(events[0].type, "created");
    assert.equal(events[1].type, "created");
  });
});
