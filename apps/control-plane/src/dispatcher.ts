import { query, type Query } from "@anthropic-ai/claude-agent-sdk";
import type { SessionManager } from "./session-manager.ts";
import type { NodeHandle } from "./providers/provider.ts";
import type { ProviderRegistry } from "./providers/registry.ts";
import { SYSTEM_PROMPT } from "./system-prompt.ts";

interface ActiveSession {
  handle: NodeHandle;
  query: Query | null;
  abortController: AbortController;
  agentSessionId: string | null;
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
        systemPrompt: { type: "preset", preset: "claude_code", append: SYSTEM_PROMPT },
      },
    });

    this.active.set(sessionId, { handle, query: q, abortController, agentSessionId: null });

    this.consumeMessages(sessionId, q);
  }

  async reply(sessionId: string, message: string): Promise<void> {
    const entry = this.active.get(sessionId);
    if (!entry) {
      throw new Error(`No active session for ${sessionId}`);
    }
    if (entry.query !== null) {
      throw new Error(`Session ${sessionId} still has an active query`);
    }
    if (!entry.agentSessionId) {
      throw new Error(`Session ${sessionId} has no agent session to resume`);
    }

    await this.manager.transition(sessionId, "running");

    const abortController = new AbortController();
    entry.abortController = abortController;

    const q = query({
      prompt: message,
      options: {
        resume: entry.agentSessionId,
        spawnClaudeCodeProcess: entry.handle.spawnFn,
        abortController,
        permissionMode: "bypassPermissions",
        systemPrompt: { type: "preset", preset: "claude_code", append: SYSTEM_PROMPT },
      },
    });

    entry.query = q;
    this.consumeMessages(sessionId, q);
  }

  async complete(sessionId: string): Promise<void> {
    const entry = this.active.get(sessionId);
    if (entry) {
      if (entry.query) {
        entry.query.close();
      }
      await entry.handle.destroy();
      this.active.delete(sessionId);
    }
    await this.manager.complete(sessionId);
  }

  async cancel(sessionId: string): Promise<void> {
    const entry = this.active.get(sessionId);
    if (entry) {
      entry.abortController.abort();
      if (entry.query) {
        entry.query.close();
      }
      await entry.handle.destroy();
      this.active.delete(sessionId);
    }
    await this.manager.cancel(sessionId);
  }

  private consumeMessages(sessionId: string, q: Query): void {
    (async () => {
      try {
        const entry = this.active.get(sessionId);
        for await (const msg of q) {
          if ("session_id" in msg && msg.session_id && entry && !entry.agentSessionId) {
            entry.agentSessionId = msg.session_id as string;
            await this.manager.update(sessionId, { agentSessionId: msg.session_id as string });
          }

          this.manager.emitAgentMessage(sessionId, msg);

          if (msg.type === "result") {
            if (msg.subtype === "success") {
              await this.manager.waitForInput(sessionId);
              if (entry) {
                entry.query = null;
              }
            } else {
              await this.manager.transition(sessionId, "failed");
              const failEntry = this.active.get(sessionId);
              if (failEntry) {
                await failEntry.handle.destroy();
                this.active.delete(sessionId);
              }
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
        const entry = this.active.get(sessionId);
        if (entry) {
          await entry.handle.destroy();
          this.active.delete(sessionId);
        }
      }
    })();
  }
}
