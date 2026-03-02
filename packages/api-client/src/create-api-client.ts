import type { CreateSessionBody, Session } from "@devtask/api-types";

export function createApiClient(baseUrl: string) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, init);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    createSession(body: CreateSessionBody): Promise<Session> {
      return request<Session>("/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },

    listSessions(): Promise<Session[]> {
      return request<Session[]>("/sessions");
    },

    getSession(id: string): Promise<Session> {
      return request<Session>(`/sessions/${id}`);
    },

    cancelSession(id: string): Promise<Session> {
      return request<Session>(`/sessions/${id}/cancel`, { method: "POST" });
    },

    replyToSession(id: string, message: string): Promise<Session> {
      return request<Session>(`/sessions/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
    },

    completeSession(id: string): Promise<Session> {
      return request<Session>(`/sessions/${id}/complete`, { method: "POST" });
    },
  };
}
