import type { Project } from "@devtask/api-types";

export function ProjectList({
  projects,
  onSelect,
}: {
  projects: Project[];
  onSelect: (project: Project) => void;
}) {
  if (projects.length === 0) {
    return <p className="text-gray-500">No projects yet.</p>;
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onSelect(project)}
          className="border border-gray-800 rounded p-4 hover:bg-gray-900 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{project.name}</h3>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
              {project.provider.type}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {project.provider.type === "local" ? project.provider.workDir : project.provider.repo}
          </p>
        </div>
      ))}
    </div>
  );
}
