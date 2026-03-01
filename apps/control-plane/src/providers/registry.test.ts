import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProviderRegistry } from "./registry.ts";
import type { NodeProvider } from "./provider.ts";

function createStubProvider(): NodeProvider {
  return {
    async provision() {
      return {
        nodeId: "stub",
        spawnFn() {
          throw new Error("not implemented");
        },
        async destroy() {},
      };
    },
  };
}

describe("ProviderRegistry", () => {
  it("registers and retrieves a provider", () => {
    const registry = new ProviderRegistry();
    const provider = createStubProvider();
    registry.register("local", provider);
    assert.equal(registry.get("local"), provider);
  });

  it("throws for unknown provider", () => {
    const registry = new ProviderRegistry();
    assert.throws(() => registry.get("nonexistent"), /Unknown provider: nonexistent/);
  });

  it("supports multiple providers", () => {
    const registry = new ProviderRegistry();
    const local = createStubProvider();
    const codespace = createStubProvider();
    registry.register("local", local);
    registry.register("codespace", codespace);
    assert.equal(registry.get("local"), local);
    assert.equal(registry.get("codespace"), codespace);
  });
});
