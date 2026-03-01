import type { SessionManager } from "./session-manager.ts";
import type { NodeProvider, NodeHandle, AgentProcess } from "./providers/provider.ts";
import type { Command } from "@devtask/protocol";

interface ActiveSession {
  handle: NodeHandle;
  process: AgentProcess;
}

export class Dispatcher {
  private active = new Map<string, ActiveSession>();
  private manager: SessionManager;
  private provider: NodeProvider;

  constructor(manager: SessionManager, provider: NodeProvider) {
    this.manager = manager;
    this.provider = provider;
  }

  start(): void {
    this.manager.subscribe("*", (event) => {
      if (event.type === "created") {
        this.dispatch(event.session.id).catch((err) => {
          console.error(`dispatch failed for ${event.session.id}:`, err);
        });
      }
    });
  }

  async dispatch(sessionId: string): Promise<void> {
    const session = this.manager.get(sessionId);
    if (session.status !== "queued") return;

    await this.manager.transition(sessionId, "provisioning");

    let handle: NodeHandle;
    try {
      handle = await this.provider.provision({
        sessionId,
        provider: session.provider,
      });
    } catch (err) {
      await this.manager.transition(sessionId, "failed");
      return;
    }

    await this.manager.transition(sessionId, "running");

    const process = handle.start(session.brief);
    this.active.set(sessionId, { handle, process });

    this.consumeMessages(sessionId, handle, process);
  }

  async signal(sessionId: string, command: Command): Promise<void> {
    const entry = this.active.get(sessionId);
    if (!entry) return;
    await entry.process.signal(command);
  }

  async cancel(sessionId: string): Promise<void> {
    const entry = this.active.get(sessionId);
    if (entry) {
      await entry.process.kill();
      await entry.handle.destroy();
      this.active.delete(sessionId);
    }
    await this.manager.cancel(sessionId);
  }

  private consumeMessages(
    sessionId: string,
    handle: NodeHandle,
    process: AgentProcess,
  ): void {
    (async () => {
      try {
        for await (const msg of process.messages) {
          this.manager.emitAgentMessage(sessionId, msg);

          if (msg.type === "status") {
            if (msg.status === "done") {
              await this.manager.transition(sessionId, "done");
              break;
            }
            if (msg.status === "failed") {
              await this.manager.transition(sessionId, "failed");
              break;
            }
          }
        }
      } catch (err) {
        try {
          await this.manager.transition(sessionId, "failed");
        } catch {
          // Session may already be in a terminal state
        }
      } finally {
        await handle.destroy();
        this.active.delete(sessionId);
      }
    })();
  }
}
