import { query, type Query } from "@anthropic-ai/claude-agent-sdk";
import type { SessionManager } from "./session-manager.ts";
import type { NodeHandle } from "./providers/provider.ts";
import type { ProviderRegistry } from "./providers/registry.ts";

interface ActiveSession {
  handle: NodeHandle;
  query: Query;
  abortController: AbortController;
}

export class Dispatcher {
  private active = new Map<string, ActiveSession>();
  private manager: SessionManager;
  private providers: ProviderRegistry;

  constructor(manager: SessionManager, providers: ProviderRegistry) {
    this.manager = manager;
    this.providers = providers;
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
    if (session.status !== "queued") {
      return;
    }

    await this.manager.transition(sessionId, "provisioning");

    let handle: NodeHandle;
    try {
      const provider = this.providers.get(session.provider);
      handle = await provider.provision({
        sessionId,
        provider: session.provider,
      });
    } catch {
      await this.manager.transition(sessionId, "failed");
      return;
    }

    await this.manager.transition(sessionId, "running");
    await this.manager.update(sessionId, { nodeId: handle.nodeId });

    const abortController = new AbortController();
    const q = query({
      prompt: session.brief,
      options: {
        spawnClaudeCodeProcess: handle.spawnFn,
        abortController,
        permissionMode: "bypassPermissions",
      },
    });

    this.active.set(sessionId, { handle, query: q, abortController });

    this.consumeMessages(sessionId, handle, q);
  }

  async cancel(sessionId: string): Promise<void> {
    const entry = this.active.get(sessionId);
    if (entry) {
      entry.abortController.abort();
      entry.query.close();
      await entry.handle.destroy();
      this.active.delete(sessionId);
    }
    await this.manager.cancel(sessionId);
  }

  private consumeMessages(sessionId: string, handle: NodeHandle, q: Query): void {
    (async () => {
      try {
        let agentSessionIdCaptured = false;
        for await (const msg of q) {
          if ("session_id" in msg && msg.session_id && !agentSessionIdCaptured) {
            await this.manager.update(sessionId, { agentSessionId: msg.session_id as string });
            agentSessionIdCaptured = true;
          }

          this.manager.emitAgentMessage(sessionId, msg);

          if (msg.type === "result") {
            if (msg.subtype === "success") {
              await this.manager.transition(sessionId, "done");
            } else {
              await this.manager.transition(sessionId, "failed");
            }
            break;
          }
        }
      } catch {
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
