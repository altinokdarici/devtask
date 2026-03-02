import type { Project } from "@devtask/api-types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.tsx";
import { Badge } from "./ui/badge.tsx";

export function ProjectList({
  projects,
  onSelect,
}: {
  projects: Project[];
  onSelect: (project: Project) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Card
          key={project.id}
          onClick={() => onSelect(project)}
          className="cursor-pointer transition-colors hover:bg-muted/50"
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
              {project.provider.type === "local" ? project.provider.workDir : project.provider.repo}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
