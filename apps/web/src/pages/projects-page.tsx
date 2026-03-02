import { useState } from "react";
import { useLoaderData } from "@tanstack/react-router";
import { ProjectList } from "../components/project-list.tsx";
import { CreateProjectForm } from "../components/create-project-form.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { projectsRoute, router } from "../routes.ts";

export function ProjectsPage() {
  const projects = useLoaderData({ from: projectsRoute.id });
  const [showForm, setShowForm] = useState(false);

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
            router.invalidate();
            setShowForm(false);
          }}
        />
      )}

      <ProjectList projects={projects} />
    </div>
  );
}
