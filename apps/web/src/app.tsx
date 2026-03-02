import { useState } from "react";
import type { Project, Session } from "@devtask/api-types";
import { useProjects } from "./hooks/use-projects.ts";
import { useSessions } from "./hooks/use-sessions.ts";
import { ProjectList } from "./components/project-list.tsx";
import { CreateProjectForm } from "./components/create-project-form.tsx";
import { SessionList } from "./components/session-list.tsx";
import { SessionDetail } from "./components/session-detail.tsx";
import { CreateSessionForm } from "./components/create-session-form.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card, CardContent } from "./components/ui/card.tsx";
import { Badge } from "./components/ui/badge.tsx";

export function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">DevTask</h1>
      <p className="mt-1 mb-8 text-muted-foreground text-sm">
        Parallel AI task sessions for developers.
      </p>

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
    return <p className="text-muted-foreground text-sm">Loading projects...</p>;
  }

  if (error) {
    return <p className="text-destructive-foreground text-sm">Error: {error}</p>;
  }

  if (projects.length === 0 && !showForm) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-muted-foreground text-5xl mb-4">&#9776;</div>
          <h2 className="text-lg font-semibold mb-2">No projects yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Projects group your sessions and configure where tasks run. Create your first project to
            get started.
          </p>
          <Button onClick={() => setShowForm(true)}>Create your first project</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Project"}
        </Button>
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
        <Button variant="ghost" size="sm" onClick={onBack}>
          &larr; Projects
        </Button>
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <Badge variant="secondary">{project.provider.type}</Badge>
      </div>

      <CreateSessionForm projectId={project.id} onCreated={refetch} />

      {loading && <p className="text-muted-foreground text-sm">Loading sessions...</p>}
      {error && <p className="text-destructive-foreground text-sm">Error: {error}</p>}
      {!loading && !error && <SessionList sessions={sessions} onSelect={onSelectSession} />}
    </div>
  );
}
