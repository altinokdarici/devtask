import fs from "node:fs/promises";
import path from "node:path";
import type { Project } from "@devtask/api-types";
import type { ProjectStore } from "./project-store.type.ts";

const PROJECTS_DIR = path.join(".devtask", "projects");

async function ensureDir(): Promise<void> {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
}

function filePath(id: string): string {
  return path.join(PROJECTS_DIR, `${id}.json`);
}

export function createProjectFileStore(): ProjectStore {
  return { save, remove, loadAll };
}

async function save(project: Project): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(project.id), JSON.stringify(project, null, 2));
}

async function remove(id: string): Promise<void> {
  await ensureDir();
  await fs.rm(filePath(id), { force: true });
}

async function loadAll(): Promise<Project[]> {
  await ensureDir();
  const files = await fs.readdir(PROJECTS_DIR);
  const projects: Project[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }
    const data = await fs.readFile(path.join(PROJECTS_DIR, file), "utf-8");
    projects.push(JSON.parse(data) as Project);
  }
  return projects;
}
