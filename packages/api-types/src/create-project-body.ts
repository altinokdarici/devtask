import type { ProjectProvider } from "./project-provider.type.ts";

export interface CreateProjectBody {
  name: string;
  provider: ProjectProvider;
}
