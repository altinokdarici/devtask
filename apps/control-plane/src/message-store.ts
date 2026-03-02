import fs from "node:fs/promises";
import path from "node:path";
import type { MessageStore } from "./message-store.type.ts";

const SESSIONS_DIR = path.join(".devtask", "sessions");

function filePath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.messages.jsonl`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

export function createFileMessageStore(): MessageStore {
  return { append, loadAll };
}

async function append(sessionId: string, message: unknown): Promise<void> {
  await ensureDir();
  await fs.appendFile(filePath(sessionId), JSON.stringify(message) + "\n");
}

async function loadAll(sessionId: string): Promise<unknown[]> {
  await ensureDir();
  let content: string;
  try {
    content = await fs.readFile(filePath(sessionId), "utf-8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
  return content
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
}
