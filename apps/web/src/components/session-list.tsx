import type { Session } from "@devtask/api-types";
import { SessionStatusBadge } from "./session-status-badge.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table.tsx";

export function SessionList({
  sessions,
  onSelect,
}: {
  sessions: Session[];
  onSelect: (session: Session) => void;
}) {
  if (sessions.length === 0) {
    return <p className="text-muted-foreground">No sessions yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Brief</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id} onClick={() => onSelect(session)} className="cursor-pointer">
            <TableCell className="font-mono text-xs">{session.id.slice(0, 8)}</TableCell>
            <TableCell>{session.brief}</TableCell>
            <TableCell>
              <SessionStatusBadge status={session.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(session.createdAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
