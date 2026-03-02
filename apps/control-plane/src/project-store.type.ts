import type { Project } from "@devtask/api-types";

export interface ProjectStore {
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  loadAll(): Promise<Project[]>;
}
