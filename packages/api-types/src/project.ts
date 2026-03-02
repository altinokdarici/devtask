import type { ProjectProvider } from "./project-provider.type.ts";

export interface Project {
  id: string;
  name: string;
  provider: ProjectProvider;
  createdAt: string;
  updatedAt: string;
}
