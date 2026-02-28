import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encodeLine, decodeLine, createLineParser } from "./codec.ts";
import type { AgentMessage, Command } from "./messages.ts";

describe("codec", () => {
  describe("encodeLine / decodeLine", () => {
    it("round-trips a status message", () => {
      const msg: AgentMessage = { type: "status", status: "running" };
      const encoded = encodeLine(msg);
      assert.ok(encoded.endsWith("\n"));
      const decoded = decodeLine(encoded.trim());
      assert.deepEqual(decoded, msg);
    });

    it("round-trips a log message", () => {
      const msg: AgentMessage = { type: "log", text: "hello world" };
      const decoded = decodeLine(encodeLine(msg).trim());
      assert.deepEqual(decoded, msg);
    });

    it("round-trips a question message", () => {
      const msg: AgentMessage = {
        type: "question",
        id: "q1",
        text: "Which framework?",
        options: ["vitest", "jest"],
      };
      const decoded = decodeLine(encodeLine(msg).trim());
      assert.deepEqual(decoded, msg);
    });

    it("round-trips an answer command", () => {
      const cmd: Command = { type: "answer", questionId: "q1", value: "vitest" };
      const decoded = decodeLine(encodeLine(cmd).trim());
      assert.deepEqual(decoded, cmd);
    });

    it("round-trips a signal command", () => {
      const cmd: Command = { type: "signal", action: "cancel" };
      const decoded = decodeLine(encodeLine(cmd).trim());
      assert.deepEqual(decoded, cmd);
    });
  });

  describe("decodeLine errors", () => {
    it("throws on invalid JSON", () => {
      assert.throws(() => decodeLine("not json"), SyntaxError);
    });

    it("throws on empty string", () => {
      assert.throws(() => decodeLine(""), SyntaxError);
    });
  });

  describe("createLineParser", () => {
    it("emits complete lines", () => {
      const lines: string[] = [];
      const parse = createLineParser((line) => lines.push(line));

      parse('{"type":"status","status":"running"}\n');
      assert.equal(lines.length, 1);
      assert.deepEqual(JSON.parse(lines[0]), { type: "status", status: "running" });
    });

    it("buffers partial lines across chunks", () => {
      const lines: string[] = [];
      const parse = createLineParser((line) => lines.push(line));

      parse('{"type":"lo');
      assert.equal(lines.length, 0);

      parse('g","text":"hello"}\n');
      assert.equal(lines.length, 1);
      assert.deepEqual(JSON.parse(lines[0]), { type: "log", text: "hello" });
    });

    it("handles multiple lines in one chunk", () => {
      const lines: string[] = [];
      const parse = createLineParser((line) => lines.push(line));

      parse('{"type":"log","text":"one"}\n{"type":"log","text":"two"}\n');
      assert.equal(lines.length, 2);
      assert.deepEqual(JSON.parse(lines[0]), { type: "log", text: "one" });
      assert.deepEqual(JSON.parse(lines[1]), { type: "log", text: "two" });
    });

    it("handles mixed complete and partial lines", () => {
      const lines: string[] = [];
      const parse = createLineParser((line) => lines.push(line));

      parse('{"type":"log","text":"first"}\n{"type":"lo');
      assert.equal(lines.length, 1);

      parse('g","text":"second"}\n');
      assert.equal(lines.length, 2);
    });

    it("skips empty lines", () => {
      const lines: string[] = [];
      const parse = createLineParser((line) => lines.push(line));

      parse('\n\n{"type":"log","text":"hi"}\n\n');
      assert.equal(lines.length, 1);
    });

    it("handles chunks split at newline boundary", () => {
      const lines: string[] = [];
      const parse = createLineParser((line) => lines.push(line));

      parse('{"type":"status","status":"done"}');
      assert.equal(lines.length, 0);

      parse("\n");
      assert.equal(lines.length, 1);
    });
  });
});
