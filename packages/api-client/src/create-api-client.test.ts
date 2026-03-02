import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import type { Session, Project } from "@devtask/api-types";
import { createApiClient } from "./create-api-client.ts";

const TEST_BASE_URL = "http://localhost:9999";

const fakeSession: Session = {
  id: "sess-1",
  projectId: "proj-1",
  brief: "test task",
  status: "queued",
  provider: "local",
  createdAt: "2026-03-02T00:00:00Z",
  updatedAt: "2026-03-02T00:00:00Z",
};

const fakeProject: Project = {
  id: "proj-1",
  name: "my-project",
  provider: { type: "local", workDir: "/tmp/work" },
  createdAt: "2026-03-02T00:00:00Z",
  updatedAt: "2026-03-02T00:00:00Z",
};

type FetchFn = typeof globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

describe("createApiClient", () => {
  const originalFetch = globalThis.fetch;
  const api = createApiClient(TEST_BASE_URL);

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  describe("createSession", () => {
    it("sends POST /sessions with JSON body", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(fakeSession));
      globalThis.fetch = mockFetch;

      const result = await api.createSession({ brief: "test task", projectId: "proj-1" });

      assert.equal(mockFetch.mock.callCount(), 1);
      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/sessions`);
      assert.equal(init?.method, "POST");
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers?.["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(init?.body as string), {
        brief: "test task",
        projectId: "proj-1",
      });
      assert.deepEqual(result, fakeSession);
    });

    it("throws on non-ok response", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => textResponse("bad request", 400));
      globalThis.fetch = mockFetch;

      await assert.rejects(() => api.createSession({ brief: "fail", projectId: "proj-1" }), {
        message: "HTTP 400: bad request",
      });
    });
  });

  describe("listSessions", () => {
    it("sends GET /sessions", async () => {
      const sessions = [fakeSession];
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(sessions));
      globalThis.fetch = mockFetch;

      const result = await api.listSessions();

      assert.equal(mockFetch.mock.callCount(), 1);
      const [url] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/sessions`);
      assert.deepEqual(result, sessions);
    });
  });

  describe("getSession", () => {
    it("sends GET /sessions/:id", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(fakeSession));
      globalThis.fetch = mockFetch;

      const result = await api.getSession("sess-1");

      const [url] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/sessions/sess-1`);
      assert.deepEqual(result, fakeSession);
    });

    it("throws on 404", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => textResponse("not found", 404));
      globalThis.fetch = mockFetch;

      await assert.rejects(() => api.getSession("missing"), {
        message: "HTTP 404: not found",
      });
    });
  });

  describe("cancelSession", () => {
    it("sends POST /sessions/:id/cancel", async () => {
      const cancelled = { ...fakeSession, status: "cancelled" as const };
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(cancelled));
      globalThis.fetch = mockFetch;

      const result = await api.cancelSession("sess-1");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/sessions/sess-1/cancel`);
      assert.equal(init?.method, "POST");
      assert.equal(result.status, "cancelled");
    });
  });

  describe("replyToSession", () => {
    it("sends POST /sessions/:id/reply with message body", async () => {
      const waiting = { ...fakeSession, status: "running" as const };
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(waiting));
      globalThis.fetch = mockFetch;

      const result = await api.replyToSession("sess-1", "continue please");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/sessions/sess-1/reply`);
      assert.equal(init?.method, "POST");
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers?.["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(init?.body as string), { message: "continue please" });
      assert.deepEqual(result, waiting);
    });
  });

  describe("completeSession", () => {
    it("sends POST /sessions/:id/complete", async () => {
      const done = { ...fakeSession, status: "done" as const };
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(done));
      globalThis.fetch = mockFetch;

      const result = await api.completeSession("sess-1");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/sessions/sess-1/complete`);
      assert.equal(init?.method, "POST");
      assert.equal(result.status, "done");
    });
  });

  describe("createProject", () => {
    it("sends POST /projects with JSON body", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(fakeProject));
      globalThis.fetch = mockFetch;

      const result = await api.createProject({
        name: "my-project",
        provider: { type: "local", workDir: "/tmp/work" },
      });

      assert.equal(mockFetch.mock.callCount(), 1);
      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/projects`);
      assert.equal(init?.method, "POST");
      const headers = init?.headers as Record<string, string>;
      assert.equal(headers?.["Content-Type"], "application/json");
      assert.deepEqual(result, fakeProject);
    });
  });

  describe("listProjects", () => {
    it("sends GET /projects", async () => {
      const projects = [fakeProject];
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(projects));
      globalThis.fetch = mockFetch;

      const result = await api.listProjects();

      const [url] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/projects`);
      assert.deepEqual(result, projects);
    });
  });

  describe("getProject", () => {
    it("sends GET /projects/:id", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(fakeProject));
      globalThis.fetch = mockFetch;

      const result = await api.getProject("proj-1");

      const [url] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/projects/proj-1`);
      assert.deepEqual(result, fakeProject);
    });

    it("throws on 404", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => textResponse("not found", 404));
      globalThis.fetch = mockFetch;

      await assert.rejects(() => api.getProject("missing"), {
        message: "HTTP 404: not found",
      });
    });
  });

  describe("deleteProject", () => {
    it("sends DELETE /projects/:id", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => jsonResponse(null));
      globalThis.fetch = mockFetch;

      await api.deleteProject("proj-1");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/projects/proj-1`);
      assert.equal(init?.method, "DELETE");
    });
  });
});
