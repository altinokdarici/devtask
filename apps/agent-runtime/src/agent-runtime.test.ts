import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createLineParser, decodeLine } from "@devtask/protocol";
import type { AgentMessage } from "@devtask/protocol";

function spawnAgent(brief: string): ReturnType<typeof spawn> {
  return spawn("node", ["--experimental-strip-types", "src/index.ts", brief], {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, DEVTASK_MOCK_AGENT: "1" },
  });
}

function collectMessages(child: ReturnType<typeof spawn>): Promise<AgentMessage[]> {
  return new Promise((resolve) => {
    const messages: AgentMessage[] = [];
    const parse = createLineParser((line) => {
      try {
        messages.push(decodeLine(line) as AgentMessage);
      } catch {
        // skip
      }
    });

    child.stdout!.on("data", (chunk: Buffer) => {
      parse(chunk.toString());
    });

    child.on("close", () => {
      resolve(messages);
    });
  });
}

describe("agent-runtime", () => {
  it("emits expected NDJSON sequence for a task", async () => {
    const child = spawnAgent("fix the login bug");
    const messages = await collectMessages(child);

    assert.ok(messages.length >= 4, `Expected at least 4 messages, got ${messages.length}`);

    assert.deepEqual(messages[0], { type: "status", status: "running" });
    assert.equal(messages[1]!.type, "log");
    assert.ok((messages[1] as { type: "log"; text: string }).text.includes("fix the login bug"));

    const last = messages[messages.length - 1];
    assert.deepEqual(last, { type: "status", status: "done" });
  });

  it("exits on cancel signal", async () => {
    const child = spawnAgent("long running task");

    // Wait for the first status message
    await new Promise<void>((resolve) => {
      const parse = createLineParser((line) => {
        const msg = decodeLine(line) as AgentMessage;
        if (msg.type === "status" && msg.status === "running") {
          resolve();
        }
      });
      child.stdout!.on("data", (chunk: Buffer) => parse(chunk.toString()));
    });

    // Send cancel signal
    child.stdin!.write(JSON.stringify({ type: "signal", action: "cancel" }) + "\n");

    // Wait for process to exit
    const exitCode = await new Promise<number | null>((resolve) => {
      child.on("close", (code) => resolve(code));
    });

    assert.equal(exitCode, 0);
  });
});
