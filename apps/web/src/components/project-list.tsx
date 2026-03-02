import type { Project } from "@devtask/api-types";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.tsx";
import { Badge } from "./ui/badge.tsx";

export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project, i) => (
        <Link
          key={project.id}
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          className="no-underline"
        >
          <Card
            className="cursor-pointer animate-fade-up transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="truncate">{project.name}</CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  {project.provider.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground truncate">
                {project.provider.type === "local"
                  ? project.provider.workDir
                  : project.provider.repo}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
