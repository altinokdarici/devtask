import type { Session, CreateSessionBody } from "@devtask/api-types";

let baseUrl = "http://localhost:4000";

export function setBaseUrl(url: string): void {
  baseUrl = url;
}

export function getBaseUrl(): string {
  return baseUrl;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function createSession(body: CreateSessionBody): Promise<Session> {
  return request<Session>("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listSessions(): Promise<Session[]> {
  return request<Session[]>("/sessions");
}

export async function getSession(id: string): Promise<Session> {
  return request<Session>(`/sessions/${id}`);
}

export async function pauseSession(id: string): Promise<Session> {
  return request<Session>(`/sessions/${id}/pause`, { method: "POST" });
}

export async function resumeSession(id: string): Promise<Session> {
  return request<Session>(`/sessions/${id}/resume`, { method: "POST" });
}

export async function cancelSession(id: string): Promise<Session> {
  return request<Session>(`/sessions/${id}/cancel`, { method: "POST" });
}

export async function streamEvents(
  id: string,
  onEvent: (event: string, data: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${baseUrl}/sessions/${id}/events`, { signal });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      let currentEvent = "message";
      let currentData = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          currentData = line.slice(5).trim();
        } else if (line === "") {
          if (currentData) {
            onEvent(currentEvent, currentData);
          }
          currentEvent = "message";
          currentData = "";
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
