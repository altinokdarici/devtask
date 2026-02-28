import fs from "node:fs/promises";
import path from "node:path";
import type { Session, SessionStore } from "./types.ts";

const SESSIONS_DIR = path.join(".devtask", "sessions");

async function ensureDir(): Promise<void> {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

function filePath(id: string): string {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

export function createFileStore(): SessionStore {
  return { save, loadAll };
}

async function save(session: Session): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(session.id), JSON.stringify(session, null, 2));
}

async function loadAll(): Promise<Session[]> {
  await ensureDir();
  const files = await fs.readdir(SESSIONS_DIR);
  const sessions: Session[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const data = await fs.readFile(path.join(SESSIONS_DIR, file), "utf-8");
    sessions.push(JSON.parse(data) as Session);
  }
  return sessions;
}
