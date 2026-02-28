import fs from "node:fs/promises";
import path from "node:path";
import type { Session } from "./types.js";

const SESSIONS_DIR = path.join(".devtask", "sessions");

async function ensureDir(): Promise<void> {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

function filePath(id: string): string {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

export async function saveSession(session: Session): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(session.id), JSON.stringify(session, null, 2));
}

export async function loadSession(id: string): Promise<Session | undefined> {
  try {
    const data = await fs.readFile(filePath(id), "utf-8");
    return JSON.parse(data) as Session;
  } catch {
    return undefined;
  }
}

export async function loadAllSessions(): Promise<Session[]> {
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

export async function deleteSession(id: string): Promise<void> {
  try {
    await fs.unlink(filePath(id));
  } catch {
    // ignore if already gone
  }
}
