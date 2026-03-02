import type { Project } from "@devtask/api-types";

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
        <div
          key={project.id}
          onClick={() => onSelect(project)}
          className="border border-gray-800 rounded-lg p-5 hover:border-gray-600 hover:bg-gray-900/50 cursor-pointer transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-100 truncate">{project.name}</h3>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded ml-2 shrink-0">
              {project.provider.type}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {project.provider.type === "local" ? project.provider.workDir : project.provider.repo}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
