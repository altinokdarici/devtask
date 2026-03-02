import { useState } from "react";
import type { Project, Session } from "@devtask/api-types";
import { useProjects } from "./hooks/use-projects.ts";
import { useSessions } from "./hooks/use-sessions.ts";
import { ProjectList } from "./components/project-list.tsx";
import { CreateProjectForm } from "./components/create-project-form.tsx";
import { SessionList } from "./components/session-list.tsx";
import { SessionDetail } from "./components/session-detail.tsx";
import { CreateSessionForm } from "./components/create-session-form.tsx";
import { ThemeToggle } from "./components/theme-toggle.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card, CardContent } from "./components/ui/card.tsx";
import { Badge } from "./components/ui/badge.tsx";

export function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <h1 className="font-display text-xl font-bold tracking-tight">
              Dev<span className="text-primary">Task</span>
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6">
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
      </main>
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
    return <p className="text-destructive text-sm">Error: {error}</p>;
  }

  if (projects.length === 0 && !showForm) {
    return (
      <Card className="mx-auto max-w-md mt-16 animate-fade-up">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center gap-5 mb-8">
            {[0, 0.3, 0.6].map((delay) => (
              <div
                key={delay}
                className="w-2.5 h-6 rounded-sm bg-primary/30 animate-cursor-blink"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <h2 className="font-display text-lg font-bold mb-2">No projects yet</h2>
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
        <h2 className="font-display text-lg font-bold">Projects</h2>
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
        <h2 className="font-display text-lg font-bold">{project.name}</h2>
        <Badge variant="secondary">{project.provider.type}</Badge>
      </div>

      <CreateSessionForm projectId={project.id} onCreated={refetch} />

      {loading && <p className="text-muted-foreground text-sm">Loading sessions...</p>}
      {error && <p className="text-destructive text-sm">Error: {error}</p>}
      {!loading && !error && <SessionList sessions={sessions} onSelect={onSelectSession} />}
    </div>
  );
}
