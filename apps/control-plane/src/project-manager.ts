import crypto from "node:crypto";
import type { Project, CreateProjectBody } from "@devtask/api-types";
import type { ProjectStore } from "./project-store.type.ts";
import { ProjectNotFoundError } from "./project-not-found-error.ts";

export class ProjectManager {
  private projects = new Map<string, Project>();
  private store: ProjectStore;

  constructor(store: ProjectStore) {
    this.store = store;
  }

  async init(): Promise<void> {
    const persisted = await this.store.loadAll();
    for (const p of persisted) {
      this.projects.set(p.id, p);
    }
  }

  async create(body: CreateProjectBody): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: body.name,
      provider: body.provider,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    await this.store.save(project);
    return project;
  }

  list(): Project[] {
    return [...this.projects.values()];
  }

  get(id: string): Project {
    const project = this.projects.get(id);
    if (!project) {
      throw new ProjectNotFoundError(id);
    }
    return project;
  }

  async delete(id: string): Promise<void> {
    this.get(id);
    this.projects.delete(id);
    await this.store.remove(id);
  }
}
