import type { CreateSessionBody, CreateProjectBody, Session, Project } from "@devtask/api-types";

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
      return request<Session>("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },

    listSessions(projectId?: string): Promise<Session[]> {
      const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
      return request<Session[]>(`/api/sessions${qs}`);
    },

    getSession(id: string): Promise<Session> {
      return request<Session>(`/api/sessions/${id}`);
    },

    cancelSession(id: string): Promise<Session> {
      return request<Session>(`/api/sessions/${id}/cancel`, { method: "POST" });
    },

    replyToSession(id: string, message: string): Promise<Session> {
      return request<Session>(`/api/sessions/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
    },

    completeSession(id: string): Promise<Session> {
      return request<Session>(`/api/sessions/${id}/complete`, { method: "POST" });
    },

    createProject(body: CreateProjectBody): Promise<Project> {
      return request<Project>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },

    listProjects(): Promise<Project[]> {
      return request<Project[]>("/api/projects");
    },

    getProject(id: string): Promise<Project> {
      return request<Project>(`/api/projects/${id}`);
    },

    deleteProject(id: string): Promise<void> {
      return request<void>(`/api/projects/${id}`, { method: "DELETE" });
    },
  };
}
