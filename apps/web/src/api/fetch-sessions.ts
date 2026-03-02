import type { Session } from "@devtask/api-types";

export async function fetchSessions(): Promise<Session[]> {
  const res = await fetch("/sessions");
  if (!res.ok) {
    throw new Error(`Failed to fetch sessions: ${res.status}`);
  }
  return res.json();
}
