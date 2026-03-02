import { useState } from "react";
import type { Project, Session } from "@devtask/api-types";
import { useProjects } from "./hooks/use-projects.ts";
import { useSessions } from "./hooks/use-sessions.ts";
import { ProjectList } from "./components/project-list.tsx";
import { CreateProjectForm } from "./components/create-project-form.tsx";
import { SessionList } from "./components/session-list.tsx";
import { SessionDetail } from "./components/session-detail.tsx";
import { CreateSessionForm } from "./components/create-session-form.tsx";

export function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">DevTask</h1>
      <p className="mt-1 mb-6 text-gray-400 text-sm">Parallel AI task sessions for developers.</p>

      {selectedSession ? (
        <SessionDetail
          session={selectedSession}
          onBack={() => setSelectedSession(null)}
          onRefresh={() => setSelectedSession(null)}
        />
      ) : selectedProject ? (
        <ProjectSessionsView
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
          onSelectSession={setSelectedSession}
        />
      ) : (
        <ProjectsView onSelect={setSelectedProject} />
      )}
    </div>
  );
}

function ProjectsView({ onSelect }: { onSelect: (project: Project) => void }) {
  const { projects, loading, error, refetch } = useProjects();

  return (
    <div className="space-y-6">
      <CreateProjectForm onCreated={refetch} />

      {loading && <p className="text-gray-500 text-sm">Loading projects...</p>}
      {error && <p className="text-red-400 text-sm">Error: {error}</p>}
      {!loading && !error && <ProjectList projects={projects} onSelect={onSelect} />}
    </div>
  );
}

function ProjectSessionsView({
  project,
  onBack,
  onSelectSession,
}: {
  project: Project;
  onBack: () => void;
  onSelectSession: (session: Session) => void;
}) {
  const { sessions, loading, error, refetch } = useSessions(project.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-200 text-sm">
          &larr; Projects
        </button>
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
          {project.provider.type}
        </span>
      </div>

      <CreateSessionForm projectId={project.id} onCreated={refetch} />

      {loading && <p className="text-gray-500 text-sm">Loading sessions...</p>}
      {error && <p className="text-red-400 text-sm">Error: {error}</p>}
      {!loading && !error && <SessionList sessions={sessions} onSelect={onSelectSession} />}
    </div>
  );
}
