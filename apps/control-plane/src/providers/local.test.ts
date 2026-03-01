import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createLocalProvider } from "./local.ts";

describe("LocalProvider", () => {
  it("provisions a node with a unique nodeId and spawnFn", async () => {
    const provider = createLocalProvider();
    const handle = await provider.provision({ sessionId: "s1", provider: "local" });
    assert.ok(handle.nodeId);
    assert.equal(typeof handle.nodeId, "string");
    assert.equal(typeof handle.spawnFn, "function");
    await handle.destroy();
  });

  it("spawnFn spawns a real process", async () => {
    const provider = createLocalProvider();
    const handle = await provider.provision({ sessionId: "s1", provider: "local" });

    const ac = new AbortController();
    const proc = handle.spawnFn({
      command: "node",
      args: ["-e", "process.stdout.write('hello')"],
      env: { ...process.env },
      signal: ac.signal,
    });

    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve) => {
      proc.on("exit", () => resolve());
    });

    const output = Buffer.concat(chunks).toString();
    assert.equal(output, "hello");
    assert.equal(proc.exitCode, 0);

    await handle.destroy();
  });

  it("provisions two nodes with distinct ids", async () => {
    const provider = createLocalProvider();
    const h1 = await provider.provision({ sessionId: "s1", provider: "local" });
    const h2 = await provider.provision({ sessionId: "s2", provider: "local" });
    assert.notEqual(h1.nodeId, h2.nodeId);
    await h1.destroy();
    await h2.destroy();
  });
});
