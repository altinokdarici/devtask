import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createLocalProvider } from "./local.ts";

// Mock agent script: reads brief from argv, emits status + log + question,
// reads an answer from stdin, emits a final log, then emits done.
const MOCK_AGENT = `
  const brief = process.argv[process.argv.length - 1];
  function emit(msg) { process.stdout.write(JSON.stringify(msg) + "\\n"); }

  emit({ type: "status", status: "running" });
  emit({ type: "log", text: "Working on: " + brief });
  emit({ type: "question", id: "q1", text: "Which approach?", options: ["a", "b"] });

  // Read answer from stdin
  let buf = "";
  process.stdin.on("data", (chunk) => {
    buf += chunk.toString();
    const idx = buf.indexOf("\\n");
    if (idx !== -1) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      const cmd = JSON.parse(line);
      emit({ type: "log", text: "Got answer: " + cmd.value });
      emit({ type: "status", status: "done" });
      process.exit(0);
    }
  });
`;

describe("LocalProvider", () => {
  it("provisions a node with a unique nodeId", async () => {
    const provider = createLocalProvider("node", ["-e", MOCK_AGENT, "--"]);
    const handle = await provider.provision({ sessionId: "s1", provider: "local" });
    assert.ok(handle.nodeId);
    assert.equal(typeof handle.nodeId, "string");
    await handle.destroy();
  });

  it("runs full lifecycle: start → messages → signal → done", async () => {
    const provider = createLocalProvider("node", ["-e", MOCK_AGENT, "--"]);
    const handle = await provider.provision({ sessionId: "s1", provider: "local" });
    const process = handle.start("fix the bug");

    const received = [];
    for await (const msg of process.messages) {
      received.push(msg);

      if (msg.type === "question") {
        await process.signal({ type: "answer", questionId: "q1", value: "option-a" });
      }

      if (msg.type === "status" && msg.status === "done") {
        break;
      }
    }

    assert.equal(received.length, 5);

    assert.deepEqual(received[0], { type: "status", status: "running" });
    assert.deepEqual(received[1], { type: "log", text: "Working on: fix the bug" });
    assert.deepEqual(received[2], {
      type: "question",
      id: "q1",
      text: "Which approach?",
      options: ["a", "b"],
    });
    assert.deepEqual(received[3], { type: "log", text: "Got answer: option-a" });
    assert.deepEqual(received[4], { type: "status", status: "done" });

    await handle.destroy();
  });

  it("kill terminates the process", async () => {
    // Agent that runs forever
    const FOREVER_AGENT = `
      function emit(msg) { process.stdout.write(JSON.stringify(msg) + "\\n"); }
      emit({ type: "status", status: "running" });
      setInterval(() => emit({ type: "log", text: "still alive" }), 100);
    `;

    const provider = createLocalProvider("node", ["-e", FOREVER_AGENT, "--"]);
    const handle = await provider.provision({ sessionId: "s2", provider: "local" });
    const proc = handle.start("loop forever");

    // Read the first message
    const iter = proc.messages[Symbol.asyncIterator]();
    const first = await iter.next();
    assert.equal(first.done, false);
    assert.deepEqual(first.value, { type: "status", status: "running" });

    // Kill should terminate — iterator should end
    await proc.kill();
    const result = await iter.next();
    // After kill, either we get buffered messages or done
    // Eventually the iterator must end
    if (!result.done) {
      // Drain remaining
      let r = await iter.next();
      while (!r.done) {
        r = await iter.next();
      }
    }

    await handle.destroy();
  });
});
