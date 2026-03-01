import { query } from "@anthropic-ai/claude-agent-sdk";
import { encodeLine } from "@devtask/protocol";
import type { AgentMessage } from "@devtask/protocol";

function emit(msg: AgentMessage): void {
  process.stdout.write(encodeLine(msg));
}

function extractText(content: unknown[]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block === "object" && block !== null && "type" in block) {
      const b = block as { type: string; text?: string };
      if (b.type === "text" && typeof b.text === "string") {
        parts.push(b.text);
      }
    }
  }
  return parts.join("\n");
}

const SYSTEM_PROMPT = `You are a DevTask coding agent. You work autonomously inside an isolated environment to complete software engineering tasks.

Your workflow:
1. Read the codebase to understand the project structure and conventions.
2. Plan the implementation — break down the task into concrete steps.
3. Implement the changes — write clean, tested code following existing patterns.
4. Run tests and fix any failures.
5. Commit your changes with a conventional commit message.
6. Push the branch and create a pull request.

Follow the project's CLAUDE.md for conventions. Keep PRs small and focused.`;

export async function runAgent(brief: string): Promise<void> {
  emit({ type: "status", status: "running" });

  const session = query({
    prompt: brief,
    options: {
      systemPrompt: SYSTEM_PROMPT,
      cwd: process.cwd(),
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      tools: { type: "preset", preset: "claude_code" },
    },
  });

  for await (const message of session) {
    switch (message.type) {
      case "assistant": {
        const text = extractText(message.message.content);
        if (text) {
          emit({ type: "log", text });
        }
        break;
      }
      case "result": {
        if (message.subtype === "success") {
          emit({ type: "status", status: "done" });
        } else {
          emit({ type: "status", status: "failed" });
        }
        break;
      }
      // Skip all other message types (system, stream_event, etc.)
    }
  }
}
