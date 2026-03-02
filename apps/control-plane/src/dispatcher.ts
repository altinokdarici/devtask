import { query, type Query } from "@anthropic-ai/claude-agent-sdk";
import type { SessionManager } from "./session-manager.ts";
import type { ProjectManager } from "./project-manager.ts";
import type { NodeHandle } from "./providers/provider.ts";
import { createProviderFromProject } from "./providers/create-provider-from-project.ts";
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
  private projectManager: ProjectManager;

  constructor(manager: SessionManager, projectManager: ProjectManager) {
    this.manager = manager;
    this.projectManager = projectManager;
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

    console.log(
      `[dispatcher] dispatch started sessionId=${sessionId} projectId=${session.projectId}`,
    );

    await this.manager.transition(sessionId, "provisioning");

    let handle: NodeHandle;
    try {
      const project = this.projectManager.get(session.projectId);
      const provider = createProviderFromProject(project.provider);
      handle = await provider.provision({
        sessionId,
        provider: project.provider.type,
      });
    } catch (err) {
      console.error(`[dispatcher] provisioning failed sessionId=${sessionId}:`, err);
      await this.manager.transition(sessionId, "failed");
      return;
    }

    console.log(
      `[dispatcher] provisioning complete sessionId=${sessionId} nodeId=${handle.nodeId}`,
    );

    await this.manager.transition(sessionId, "running");
    await this.manager.update(sessionId, { nodeId: handle.nodeId });

    const abortController = new AbortController();

    console.log(`[dispatcher] query starting sessionId=${sessionId}`);
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
    console.log(`[dispatcher] reply called sessionId=${sessionId}`);
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
    console.log(`[dispatcher] complete called sessionId=${sessionId}`);
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
    console.log(`[dispatcher] cancel called sessionId=${sessionId}`);
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

          await this.manager.emitAgentMessage(sessionId, msg);

          if (msg.type === "result") {
            if (msg.subtype === "success") {
              console.log(`[dispatcher] query finished sessionId=${sessionId} result=success`);
              await this.manager.waitForInput(sessionId);
              if (entry) {
                entry.query = null;
              }
            } else {
              console.log(
                `[dispatcher] query finished sessionId=${sessionId} result=${msg.subtype}`,
              );
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
      } catch (err) {
        console.error(`[dispatcher] consumeMessages error sessionId=${sessionId}:`, err);
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
