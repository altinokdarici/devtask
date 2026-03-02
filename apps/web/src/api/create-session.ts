import type { CreateSessionBody, Session } from "@devtask/api-types";

export async function createSession(body: CreateSessionBody): Promise<Session> {
  const res = await fetch("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to create session: ${res.status}`);
  }
  return res.json();
}
