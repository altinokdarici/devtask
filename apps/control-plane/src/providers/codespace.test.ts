import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createCodespaceProvider } from "./codespace.ts";

// We test the provider by replacing the `gh` binary with a small shell script
// that mimics `gh cs create`, `gh cs ssh`, and `gh cs delete` behavior.
// The trick: we set PATH to a temp dir containing our fake `gh`.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let tmpDir: string;
let originalPath: string;

function writeFakeGh(script: string) {
  const ghPath = path.join(tmpDir, "gh");
  fs.writeFileSync(ghPath, `#!/bin/sh\n${script}`, { mode: 0o755 });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codespace-test-"));
  originalPath = process.env["PATH"]!;
  process.env["PATH"] = `${tmpDir}:${originalPath}`;
});

afterEach(() => {
  process.env["PATH"] = originalPath;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("CodespaceProvider", () => {
  it("provision() extracts codespace name from gh output", async () => {
    // Fake gh that handles "cs create" by outputting JSON with a name field
    writeFakeGh(`
      if [ "$1" = "cs" ] && [ "$2" = "create" ]; then
        echo '{"name":"test-codespace-abc123","state":"Available"}'
        exit 0
      fi
      if [ "$1" = "cs" ] && [ "$2" = "delete" ]; then
        exit 0
      fi
      exit 1
    `);

    const provider = createCodespaceProvider({ repo: "owner/repo" });
    const handle = await provider.provision({ sessionId: "s1", provider: "codespace" });

    assert.equal(handle.nodeId, "test-codespace-abc123");

    await handle.destroy();
  });

  it("start() wires up NDJSON messages on stdout", async () => {
    // Fake gh: create returns a name, ssh runs a node script that emits messages
    writeFakeGh(`
      if [ "$1" = "cs" ] && [ "$2" = "create" ]; then
        echo '{"name":"cs-ndjson-test"}'
        exit 0
      fi
      if [ "$1" = "cs" ] && [ "$2" = "ssh" ]; then
        # Shift past: cs ssh -c <name> --
        shift 5
        # Now $@ is the command to run; exec it
        exec "$@"
      fi
      if [ "$1" = "cs" ] && [ "$2" = "delete" ]; then
        exit 0
      fi
      exit 1
    `);

    const MOCK_AGENT = `
      function emit(msg) { process.stdout.write(JSON.stringify(msg) + "\\n"); }
      emit({ type: "status", status: "running" });
      emit({ type: "log", text: "hello from codespace" });
      emit({ type: "status", status: "done" });
      process.exit(0);
    `;

    const provider = createCodespaceProvider({
      repo: "owner/repo",
      agentBundle: "-e",
    });
    const handle = await provider.provision({ sessionId: "s1", provider: "codespace" });

    // Start with the mock agent script as the "taskBrief" (which becomes the arg after -e)
    const proc = handle.start(MOCK_AGENT);

    const received = [];
    for await (const msg of proc.messages) {
      received.push(msg);
      if (msg.type === "status" && msg.status === "done") break;
    }

    assert.equal(received.length, 3);
    assert.deepEqual(received[0], { type: "status", status: "running" });
    assert.deepEqual(received[1], { type: "log", text: "hello from codespace" });
    assert.deepEqual(received[2], { type: "status", status: "done" });

    await handle.destroy();
  });

  it("signal() writes to stdin of the ssh process", async () => {
    writeFakeGh(`
      if [ "$1" = "cs" ] && [ "$2" = "create" ]; then
        echo '{"name":"cs-signal-test"}'
        exit 0
      fi
      if [ "$1" = "cs" ] && [ "$2" = "ssh" ]; then
        shift 5
        exec "$@"
      fi
      if [ "$1" = "cs" ] && [ "$2" = "delete" ]; then
        exit 0
      fi
      exit 1
    `);

    const MOCK_AGENT = `
      function emit(msg) { process.stdout.write(JSON.stringify(msg) + "\\n"); }
      emit({ type: "question", id: "q1", text: "Pick one", options: ["a", "b"] });

      let buf = "";
      process.stdin.on("data", (chunk) => {
        buf += chunk.toString();
        const idx = buf.indexOf("\\n");
        if (idx !== -1) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          const cmd = JSON.parse(line);
          emit({ type: "log", text: "received: " + cmd.value });
          emit({ type: "status", status: "done" });
          process.exit(0);
        }
      });
    `;

    const provider = createCodespaceProvider({
      repo: "owner/repo",
      agentBundle: "-e",
    });
    const handle = await provider.provision({ sessionId: "s1", provider: "codespace" });
    const proc = handle.start(MOCK_AGENT);

    const received = [];
    for await (const msg of proc.messages) {
      received.push(msg);
      if (msg.type === "question") {
        await proc.signal({ type: "answer", questionId: "q1", value: "option-a" });
      }
      if (msg.type === "status" && msg.status === "done") break;
    }

    assert.equal(received.length, 3);
    assert.deepEqual(received[0], {
      type: "question",
      id: "q1",
      text: "Pick one",
      options: ["a", "b"],
    });
    assert.deepEqual(received[1], { type: "log", text: "received: option-a" });
    assert.deepEqual(received[2], { type: "status", status: "done" });

    await handle.destroy();
  });

  it("destroy() calls gh cs delete with the codespace name", async () => {
    // Track whether delete was called with the right args
    const logFile = path.join(tmpDir, "delete-log.txt");

    writeFakeGh(`
      if [ "$1" = "cs" ] && [ "$2" = "create" ]; then
        echo '{"name":"cs-destroy-test"}'
        exit 0
      fi
      if [ "$1" = "cs" ] && [ "$2" = "delete" ]; then
        echo "$@" > ${logFile}
        exit 0
      fi
      exit 1
    `);

    const provider = createCodespaceProvider({ repo: "owner/repo" });
    const handle = await provider.provision({ sessionId: "s1", provider: "codespace" });
    assert.equal(handle.nodeId, "cs-destroy-test");

    await handle.destroy();

    const deleteLog = fs.readFileSync(logFile, "utf-8").trim();
    assert.ok(deleteLog.includes("cs-destroy-test"), "delete should reference the codespace name");
    assert.ok(deleteLog.includes("--force"), "delete should use --force flag");
  });

  it("kill() terminates the ssh process", async () => {
    writeFakeGh(`
      if [ "$1" = "cs" ] && [ "$2" = "create" ]; then
        echo '{"name":"cs-kill-test"}'
        exit 0
      fi
      if [ "$1" = "cs" ] && [ "$2" = "ssh" ]; then
        shift 5
        exec "$@"
      fi
      if [ "$1" = "cs" ] && [ "$2" = "delete" ]; then
        exit 0
      fi
      exit 1
    `);

    const FOREVER_AGENT = `
      function emit(msg) { process.stdout.write(JSON.stringify(msg) + "\\n"); }
      emit({ type: "status", status: "running" });
      setInterval(() => emit({ type: "log", text: "still alive" }), 100);
    `;

    const provider = createCodespaceProvider({
      repo: "owner/repo",
      agentBundle: "-e",
    });
    const handle = await provider.provision({ sessionId: "s1", provider: "codespace" });
    const proc = handle.start(FOREVER_AGENT);

    const iter = proc.messages[Symbol.asyncIterator]();
    const first = await iter.next();
    assert.equal(first.done, false);
    assert.deepEqual(first.value, { type: "status", status: "running" });

    await proc.kill();

    // Drain remaining messages until iterator ends
    let r = await iter.next();
    while (!r.done) {
      r = await iter.next();
    }

    await handle.destroy();
  });
});
