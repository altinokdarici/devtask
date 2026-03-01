import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCodespaceProvider } from "./codespace.ts";

// These tests verify the provider structure without calling real gh CLI.
// Real codespace integration is tested manually.

describe("CodespaceProvider", () => {
  it("creates a provider with provision method", () => {
    const provider = createCodespaceProvider({ repo: "owner/repo" });
    assert.equal(typeof provider.provision, "function");
  });

  it("provision rejects when gh cs create fails", async () => {
    const provider = createCodespaceProvider({ repo: "owner/nonexistent" });

    // gh cs create will fail since the repo doesn't exist / gh isn't authed in CI
    await assert.rejects(
      () => provider.provision({ sessionId: "s1", provider: "codespace" }),
      (err: Error) => {
        assert.ok(err.message.length > 0);
        return true;
      },
    );
  });
});
