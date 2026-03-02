import type { SseEventName } from "@devtask/api-types";
import { createApiClient } from "@devtask/api-client";

let baseUrl = "http://localhost:4000";
let client = createApiClient(baseUrl);

export function setBaseUrl(url: string): void {
  baseUrl = url;
  client = createApiClient(url);
}

export function getBaseUrl(): string {
  return baseUrl;
}

export const createSession: typeof client.createSession = (...args) =>
  client.createSession(...args);
export const listSessions: typeof client.listSessions = (...args) => client.listSessions(...args);
export const getSession: typeof client.getSession = (...args) => client.getSession(...args);
export const cancelSession: typeof client.cancelSession = (...args) =>
  client.cancelSession(...args);
export const replyToSession: typeof client.replyToSession = (...args) =>
  client.replyToSession(...args);
export const completeSession: typeof client.completeSession = (...args) =>
  client.completeSession(...args);

export const createProject: typeof client.createProject = (...args) =>
  client.createProject(...args);
export const listProjects: typeof client.listProjects = () => client.listProjects();
export const getProject: typeof client.getProject = (...args) => client.getProject(...args);
export const deleteProject: typeof client.deleteProject = (...args) =>
  client.deleteProject(...args);

export async function streamEvents(
  id: string,
  onEvent: (event: SseEventName, data: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/sessions/${id}/events`, { signal });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  if (!res.body) {
    throw new Error("No response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

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
            onEvent(currentEvent as SseEventName, currentData);
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
