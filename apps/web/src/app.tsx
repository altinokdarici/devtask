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
      <p className="mt-1 mb-8 text-gray-400 text-sm">Parallel AI task sessions for developers.</p>

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
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading projects...</p>;
  }

  if (error) {
    return <p className="text-red-400 text-sm">Error: {error}</p>;
  }

  if (projects.length === 0 && !showForm) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-gray-600 text-5xl mb-4">&#9776;</div>
        <h2 className="text-lg font-semibold text-gray-300 mb-2">No projects yet</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          Projects group your sessions and configure where tasks run. Create your first project to
          get started.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gray-100 text-gray-950 text-sm font-medium px-4 py-2 rounded hover:bg-white transition-colors"
        >
          Create your first project
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded transition-colors"
        >
          {showForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showForm && (
        <CreateProjectForm
          onCreated={() => {
            refetch();
            setShowForm(false);
          }}
        />
      )}

      <ProjectList projects={projects} onSelect={onSelect} />
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
