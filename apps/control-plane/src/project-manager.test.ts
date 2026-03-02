import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ProjectManager } from "./project-manager.ts";
import type { Project } from "@devtask/api-types";
import type { ProjectStore } from "./project-store.type.ts";
import { ProjectNotFoundError } from "./project-not-found-error.ts";

function createMemoryStore(): ProjectStore {
  const data = new Map<string, Project>();
  return {
    async save(project) {
      data.set(project.id, project);
    },
    async remove(id) {
      data.delete(id);
    },
    async loadAll() {
      return [...data.values()];
    },
  };
}

describe("ProjectManager", () => {
  let manager: ProjectManager;

  beforeEach(async () => {
    manager = new ProjectManager(createMemoryStore());
    await manager.init();
  });

  describe("create", () => {
    it("creates a project with local provider", async () => {
      const project = await manager.create({
        name: "my-project",
        provider: { type: "local", workDir: "/tmp/work" },
      });
      assert.equal(project.name, "my-project");
      assert.deepEqual(project.provider, { type: "local", workDir: "/tmp/work" });
      assert.ok(project.id);
      assert.ok(project.createdAt);
      assert.ok(project.updatedAt);
    });

    it("creates a project with codespace provider", async () => {
      const project = await manager.create({
        name: "cs-project",
        provider: { type: "codespace", repo: "owner/repo", machine: "large" },
      });
      assert.equal(project.name, "cs-project");
      assert.deepEqual(project.provider, {
        type: "codespace",
        repo: "owner/repo",
        machine: "large",
      });
    });

    it("adds project to the list", async () => {
      await manager.create({
        name: "one",
        provider: { type: "local", workDir: "/tmp/one" },
      });
      await manager.create({
        name: "two",
        provider: { type: "local", workDir: "/tmp/two" },
      });
      assert.equal(manager.list().length, 2);
    });
  });

  describe("get", () => {
    it("returns a project by id", async () => {
      const created = await manager.create({
        name: "test",
        provider: { type: "local", workDir: "/tmp" },
      });
      const fetched = manager.get(created.id);
      assert.equal(fetched.id, created.id);
    });

    it("throws ProjectNotFoundError for unknown id", () => {
      assert.throws(() => manager.get("nonexistent"), ProjectNotFoundError);
    });
  });

  describe("delete", () => {
    it("removes a project", async () => {
      const project = await manager.create({
        name: "doomed",
        provider: { type: "local", workDir: "/tmp" },
      });
      await manager.delete(project.id);
      assert.equal(manager.list().length, 0);
      assert.throws(() => manager.get(project.id), ProjectNotFoundError);
    });

    it("throws ProjectNotFoundError for unknown id", async () => {
      await assert.rejects(() => manager.delete("nonexistent"), ProjectNotFoundError);
    });
  });

  describe("init", () => {
    it("loads persisted projects on init", async () => {
      const store = createMemoryStore();
      const m1 = new ProjectManager(store);
      await m1.init();
      await m1.create({
        name: "persisted",
        provider: { type: "local", workDir: "/tmp" },
      });

      const m2 = new ProjectManager(store);
      await m2.init();
      assert.equal(m2.list().length, 1);
      assert.equal(m2.list()[0].name, "persisted");
    });
  });
});
