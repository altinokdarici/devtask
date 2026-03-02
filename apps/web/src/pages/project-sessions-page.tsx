import { Link, useLoaderData } from "@tanstack/react-router";
import { SessionList } from "../components/session-list.tsx";
import { CreateSessionForm } from "../components/create-session-form.tsx";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { projectSessionsRoute, router } from "../routes.ts";

export function ProjectSessionsPage() {
  const [project, sessions] = useLoaderData({ from: projectSessionsRoute.id });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projects">&larr; Projects</Link>
        </Button>
        <h2 className="font-display text-lg font-bold">{project.name}</h2>
        <Badge variant="secondary">{project.provider.type}</Badge>
      </div>

      <CreateSessionForm projectId={project.id} onCreated={() => router.invalidate()} />

      <SessionList sessions={sessions} projectId={project.id} />
    </div>
  );
}
