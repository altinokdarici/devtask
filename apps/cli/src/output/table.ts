import type { Session } from "@devtask/api-types";

export function formatSessionTable(sessions: Session[]): string {
  if (sessions.length === 0) {
    return "No sessions found.";
  }

  const header = "ID\tSTATUS\tPROVIDER\tBRIEF\tCREATED";
  const rows = sessions.map((s) => {
    const brief = s.brief.length > 40 ? s.brief.slice(0, 37) + "..." : s.brief;
    const created = new Date(s.createdAt).toLocaleString();
    return `${s.id.slice(0, 8)}\t${s.status}\t${s.provider}\t${brief}\t${created}`;
  });

  return [header, ...rows].join("\n");
}
