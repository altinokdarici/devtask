import type { Session, Project } from "@devtask/api-types";

export function formatSessionTable(sessions: Session[]): string {
  if (sessions.length === 0) {
    return "No sessions found.";
  }

  const header = "ID\tSTATUS\tBRIEF\tCREATED";
  const rows = sessions.map((s) => {
    const brief = s.brief.length > 40 ? s.brief.slice(0, 37) + "..." : s.brief;
    const created = new Date(s.createdAt).toLocaleString();
    return `${s.id.slice(0, 8)}\t${s.status}\t${brief}\t${created}`;
  });

  return [header, ...rows].join("\n");
}

export function formatProjectTable(projects: Project[]): string {
  if (projects.length === 0) {
    return "No projects found.";
  }

  const header = "ID\tNAME\tPROVIDER\tCREATED";
  const rows = projects.map((p) => {
    const created = new Date(p.createdAt).toLocaleString();
    const providerInfo =
      p.provider.type === "local"
        ? `local (${p.provider.workDir})`
        : `codespace (${p.provider.repo})`;
    return `${p.id.slice(0, 8)}\t${p.name}\t${providerInfo}\t${created}`;
  });

  return [header, ...rows].join("\n");
}
