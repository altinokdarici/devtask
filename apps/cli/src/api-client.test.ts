import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { setBaseUrl, getBaseUrl, streamEvents } from "./api-client.ts";

const TEST_BASE_URL = "http://localhost:9999";

type FetchFn = typeof globalThis.fetch;

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
      const mockFetch = mock.fn<FetchFn>(async () =>
        sseResponse([
          'event:snapshot\ndata:{"status":"running"}\n\n',
          'event:agent_message\ndata:{"type":"text"}\n\n',
        ]),
      );
      globalThis.fetch = mockFetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]));

      assert.equal(events.length, 2);
      assert.deepEqual(events[0], ["snapshot", '{"status":"running"}']);
      assert.deepEqual(events[1], ["agent_message", '{"type":"text"}']);

      const [url, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, `${TEST_BASE_URL}/api/sessions/sess-1/events`);
      assert.equal(init?.signal, undefined);
    });

    it("uses default event type 'message' when no event field", async () => {
      const events: [string, string][] = [];
      const mockFetch = mock.fn<FetchFn>(async () => sseResponse(["data:hello\n\n"]));
      globalThis.fetch = mockFetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]));

      assert.equal(events.length, 1);
      assert.deepEqual(events[0], ["message", "hello"]);
    });

    it("handles chunked SSE data split across reads", async () => {
      const events: [string, string][] = [];
      const mockFetch = mock.fn<FetchFn>(async () =>
        sseResponse(["event:up", "dated\ndata:ok\n\n"]),
      );
      globalThis.fetch = mockFetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]));

      assert.equal(events.length, 1);
      assert.deepEqual(events[0], ["updated", "ok"]);
    });

    it("skips empty data blocks", async () => {
      const events: [string, string][] = [];
      const mockFetch = mock.fn<FetchFn>(async () =>
        sseResponse(["event:ping\n\n", "event:snapshot\ndata:{}\n\n"]),
      );
      globalThis.fetch = mockFetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]));

      assert.equal(events.length, 1);
      assert.deepEqual(events[0], ["snapshot", "{}"]);
    });

    it("throws on non-ok response", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => textResponse("server error", 500));
      globalThis.fetch = mockFetch;

      await assert.rejects(() => streamEvents("sess-1", () => {}), {
        message: "HTTP 500: server error",
      });
    });

    it("throws when response has no body", async () => {
      const mockFetch = mock.fn<FetchFn>(async () => {
        return new Response(null, { status: 200 });
      });
      globalThis.fetch = mockFetch;

      await assert.rejects(() => streamEvents("sess-1", () => {}), {
        message: "No response body",
      });
    });

    it("passes abort signal to fetch", async () => {
      const events: [string, string][] = [];
      const ac = new AbortController();
      const mockFetch = mock.fn<FetchFn>(async () => sseResponse(["data:ok\n\n"]));
      globalThis.fetch = mockFetch;

      await streamEvents("sess-1", (event, data) => events.push([event, data]), ac.signal);

      assert.equal(events.length, 1);
      const [, init] = mockFetch.mock.calls[0].arguments;
      assert.equal(init?.signal, ac.signal);
    });
  });
});
