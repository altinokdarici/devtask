import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "./index.ts";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };
  let tempDir: string | undefined;

  afterEach(() => {
    delete process.env["DEVTASK_PORT"];
    delete process.env["DEVTASK_STORE_DIR"];
    delete process.env["DEVTASK_PROVIDER"];
    Object.assign(process.env, originalEnv);
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  function writeConfigFile(content: Record<string, unknown>): string {
    tempDir = join(tmpdir(), `devtask-config-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    const path = join(tempDir, "config.json");
    writeFileSync(path, JSON.stringify(content));
    return path;
  }

  it("returns sensible defaults", () => {
    const config = loadConfig();
    assert.equal(config.controlPlane.port, 4000);
    assert.equal(config.controlPlane.storeDir, ".devtask/sessions");
    assert.equal(config.provider.default, "local");
    assert.deepEqual(config.codespaceProfiles, {});
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

  describe("config file", () => {
    it("reads defaultProvider from file", () => {
      const path = writeConfigFile({ defaultProvider: "codespace:frontend" });
      const config = loadConfig(path);
      assert.equal(config.provider.default, "codespace:frontend");
    });

    it("reads codespaceProfiles from file", () => {
      const path = writeConfigFile({
        codespaceProfiles: {
          frontend: { repo: "org/frontend-app" },
          backend: { repo: "org/backend-api", machine: "largeMachine" },
        },
      });
      const config = loadConfig(path);
      assert.equal(Object.keys(config.codespaceProfiles).length, 2);
      assert.equal(config.codespaceProfiles["frontend"].repo, "org/frontend-app");
      assert.equal(config.codespaceProfiles["backend"].machine, "largeMachine");
    });

    it("reads port and storeDir from file", () => {
      const path = writeConfigFile({ port: 9999, storeDir: "/custom/store" });
      const config = loadConfig(path);
      assert.equal(config.controlPlane.port, 9999);
      assert.equal(config.controlPlane.storeDir, "/custom/store");
    });

    it("env vars override file values", () => {
      process.env["DEVTASK_PORT"] = "7777";
      process.env["DEVTASK_STORE_DIR"] = "/env/store";
      process.env["DEVTASK_PROVIDER"] = "local";
      const path = writeConfigFile({
        port: 9999,
        storeDir: "/file/store",
        defaultProvider: "codespace:frontend",
      });
      const config = loadConfig(path);
      assert.equal(config.controlPlane.port, 7777);
      assert.equal(config.controlPlane.storeDir, "/env/store");
      assert.equal(config.provider.default, "local");
    });

    it("handles missing config file gracefully", () => {
      const config = loadConfig("/nonexistent/path/config.json");
      assert.equal(config.controlPlane.port, 4000);
      assert.equal(config.provider.default, "local");
      assert.deepEqual(config.codespaceProfiles, {});
    });
  });
});
