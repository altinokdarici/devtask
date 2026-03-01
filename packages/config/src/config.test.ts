import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./index.ts";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    delete process.env["DEVTASK_PORT"];
    delete process.env["DEVTASK_STORE_DIR"];
    delete process.env["DEVTASK_PROVIDER"];
    Object.assign(process.env, originalEnv);
  });

  it("returns sensible defaults", () => {
    const config = loadConfig();
    assert.equal(config.controlPlane.port, 4000);
    assert.equal(config.controlPlane.storeDir, ".devtask/sessions");
    assert.equal(config.provider.default, "local");
  });

  it("reads DEVTASK_PORT from env", () => {
    process.env["DEVTASK_PORT"] = "5555";
    const config = loadConfig();
    assert.equal(config.controlPlane.port, 5555);
  });

  it("reads DEVTASK_STORE_DIR from env", () => {
    process.env["DEVTASK_STORE_DIR"] = "/tmp/devtask-sessions";
    const config = loadConfig();
    assert.equal(config.controlPlane.storeDir, "/tmp/devtask-sessions");
  });

  it("reads DEVTASK_PROVIDER from env", () => {
    process.env["DEVTASK_PROVIDER"] = "codespace";
    const config = loadConfig();
    assert.equal(config.provider.default, "codespace");
  });
});
