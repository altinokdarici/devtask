import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import type { Session } from "@devtask/api-types";
import {
  setBaseUrl,
  getBaseUrl,
  createSession,
  listSessions,
  getSession,
  pauseSession,
  resumeSession,
  cancelSession,
  replyToSession,
  completeSession,
  streamEvents,
} from "./api-client.ts";

const TEST_BASE_URL = "http://localhost:9999";

const fakeSession: Session = {
  id: "sess-1",
  brief: "test task",
  status: "queued",
  provider: "local",
  createdAt: "2026-03-02T00:00:00Z",
  updatedAt: "2026-03-02T00:00:00Z",
};

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

describe("api-client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setBaseUrl(TEST_BASE_URL);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  describe("setBaseUrl / getBaseUrl", () => {
    it("sets and returns the base URL", () => {
      setBaseUrl("http://example.com");
      assert.equal(getBaseUrl(), "http://example.com");
    });
  });

  describe("createSession", () => {
    it("sends POST /sessions with JSON body", async () => {
      const mockFetch = mock.fn(async () => jsonResponse(fakeSession));
      globalThis.fetch = mockFetch as typeof fetch;

      const result = await createSession({ brief: "test task", provider: "local" });

      assert.equal(mockFetch.mock.callCount(), 1);
      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions`);
      assert.equal(init?.method, "POST");
      assert.equal(init?.headers?.["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(init?.body as string), {
        brief: "test task",
        provider: "local",
      });
      assert.deepEqual(result, fakeSession);
    });

    it("sends POST without provider when omitted", async () => {
      const mockFetch = mock.fn(async () => jsonResponse(fakeSession));
      globalThis.fetch = mockFetch as typeof fetch;

      await createSession({ brief: "no provider" });

      const [, init] = mockFetch.mock.calls[0].arguments;
      assert.deepEqual(JSON.parse(init?.body as string), { brief: "no provider" });
    });

    it("throws on non-ok response", async () => {
      const mockFetch = mock.fn(async () => textResponse("bad request", 400));
      globalThis.fetch = mockFetch as typeof fetch;

      await assert.rejects(() => createSession({ brief: "fail" }), {
        message: "HTTP 400: bad request",
      });
    });
  });

  describe("listSessions", () => {
    it("sends GET /sessions", async () => {
      const sessions = [fakeSession];
      const mockFetch = mock.fn(async () => jsonResponse(sessions));
      globalThis.fetch = mockFetch as typeof fetch;

      const result = await listSessions();

      assert.equal(mockFetch.mock.callCount(), 1);
      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions`);
      assert.equal(init, undefined);
      assert.deepEqual(result, sessions);
    });
  });

  describe("getSession", () => {
    it("sends GET /sessions/:id", async () => {
      const mockFetch = mock.fn(async () => jsonResponse(fakeSession));
      globalThis.fetch = mockFetch as typeof fetch;

      const result = await getSession("sess-1");

      const [url] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions/sess-1`);
      assert.deepEqual(result, fakeSession);
    });

    it("throws on 404", async () => {
      const mockFetch = mock.fn(async () => textResponse("not found", 404));
      globalThis.fetch = mockFetch as typeof fetch;

      await assert.rejects(() => getSession("missing"), {
        message: "HTTP 404: not found",
      });
    });
  });

  describe("pauseSession", () => {
    it("sends POST /sessions/:id/pause", async () => {
      const paused = { ...fakeSession, status: "paused" as const };
      const mockFetch = mock.fn(async () => jsonResponse(paused));
      globalThis.fetch = mockFetch as typeof fetch;

      const result = await pauseSession("sess-1");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions/sess-1/pause`);
      assert.equal(init?.method, "POST");
      assert.equal(result.status, "paused");
    });
  });

  describe("resumeSession", () => {
    it("sends POST /sessions/:id/resume", async () => {
      const resumed = { ...fakeSession, status: "running" as const };
      const mockFetch = mock.fn(async () => jsonResponse(resumed));
      globalThis.fetch = mockFetch as typeof fetch;

      const result = await resumeSession("sess-1");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions/sess-1/resume`);
      assert.equal(init?.method, "POST");
      assert.equal(result.status, "running");
    });
  });

  describe("cancelSession", () => {
    it("sends POST /sessions/:id/cancel", async () => {
      const cancelled = { ...fakeSession, status: "cancelled" as const };
      const mockFetch = mock.fn(async () => jsonResponse(cancelled));
      globalThis.fetch = mockFetch as typeof fetch;

      const result = await cancelSession("sess-1");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions/sess-1/cancel`);
      assert.equal(init?.method, "POST");
      assert.equal(result.status, "cancelled");
    });
  });

  describe("replyToSession", () => {
    it("sends POST /sessions/:id/reply with message body", async () => {
      const waiting = { ...fakeSession, status: "running" as const };
      const mockFetch = mock.fn(async () => jsonResponse(waiting));
      globalThis.fetch = mockFetch as typeof fetch;

      const result = await replyToSession("sess-1", "continue please");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions/sess-1/reply`);
      assert.equal(init?.method, "POST");
      assert.equal(init?.headers?.["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(init?.body as string), { message: "continue please" });
      assert.deepEqual(result, waiting);
    });
  });

  describe("completeSession", () => {
    it("sends POST /sessions/:id/complete", async () => {
      const done = { ...fakeSession, status: "done" as const };
      const mockFetch = mock.fn(async () => jsonResponse(done));
      globalThis.fetch = mockFetch as typeof fetch;

      const result = await completeSession("sess-1");

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions/sess-1/complete`);
      assert.equal(init?.method, "POST");
      assert.equal(result.status, "done");
    });
  });

  describe("streamEvents", () => {
    function sseResponse(chunks: string[]): Response {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    it("parses SSE events and calls onEvent", async () => {
      const events: [string, string][] = [];
      const mockFetch = mock.fn(async () =>
        sseResponse([
          'event:snapshot\ndata:{"status":"running"}\n\n',
          'event:agent_message\ndata:{"type":"text"}\n\n',
        ]),
      );
      globalThis.fetch = mockFetch as typeof fetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]));

      assert.equal(events.length, 2);
      assert.deepEqual(events[0], ["snapshot", '{"status":"running"}']);
      assert.deepEqual(events[1], ["agent_message", '{"type":"text"}']);

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/sessions/sess-1/events`);
      assert.equal(init?.signal, undefined);
    });

    it("uses default event type 'message' when no event field", async () => {
      const events: [string, string][] = [];
      const mockFetch = mock.fn(async () => sseResponse(["data:hello\n\n"]));
      globalThis.fetch = mockFetch as typeof fetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]));

      assert.equal(events.length, 1);
      assert.deepEqual(events[0], ["message", "hello"]);
    });

    it("handles chunked SSE data split across reads", async () => {
      const events: [string, string][] = [];
      const mockFetch = mock.fn(async () => sseResponse(["event:up", "dated\ndata:ok\n\n"]));
      globalThis.fetch = mockFetch as typeof fetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]));

      assert.equal(events.length, 1);
      assert.deepEqual(events[0], ["updated", "ok"]);
    });

    it("skips empty data blocks", async () => {
      const events: [string, string][] = [];
      const mockFetch = mock.fn(async () =>
        sseResponse(["event:ping\n\n", "event:snapshot\ndata:{}\n\n"]),
      );
      globalThis.fetch = mockFetch as typeof fetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]));

      assert.equal(events.length, 1);
      assert.deepEqual(events[0], ["snapshot", "{}"]);
    });

    it("throws on non-ok response", async () => {
      const mockFetch = mock.fn(async () => textResponse("server error", 500));
      globalThis.fetch = mockFetch as typeof fetch;

      await assert.rejects(() => streamEvents("sess-1", () => {}), {
        message: "HTTP 500: server error",
      });
    });

    it("throws when response has no body", async () => {
      const mockFetch = mock.fn(async () => {
        return new Response(null, { status: 200 });
      });
      globalThis.fetch = mockFetch as typeof fetch;

      await assert.rejects(() => streamEvents("sess-1", () => {}), {
        message: "No response body",
      });
    });

    it("passes abort signal to fetch", async () => {
      const events: [string, string][] = [];
      const ac = new AbortController();
      const mockFetch = mock.fn(async (_url: string, init?: RequestInit) => {
        assert.equal(init?.signal, ac.signal);
        return sseResponse(["data:ok\n\n"]);
      });
      globalThis.fetch = mockFetch as typeof fetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]), ac.signal);

      assert.equal(events.length, 1);
    });
  });
});
