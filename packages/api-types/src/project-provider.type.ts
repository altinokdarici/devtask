export interface LocalProjectProvider {
  type: "local";
  workDir: string;
  repoUrl?: string;
}

export interface CodespaceProjectProvider {
  type: "codespace";
  repo: string;
  machine?: string;
}

export type ProjectProvider = LocalProjectProvider | CodespaceProjectProvider;
