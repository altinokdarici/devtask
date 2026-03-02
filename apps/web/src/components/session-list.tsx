import type { Session } from "@devtask/api-types";
import { Link } from "@tanstack/react-router";
import { SessionStatusBadge } from "./session-status-badge.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table.tsx";

export function SessionList({ sessions, projectId }: { sessions: Session[]; projectId: string }) {
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
          <TableRow key={session.id} className="cursor-pointer">
            <TableCell className="font-mono text-xs p-0">
              <Link
                to="/projects/$projectId/sessions/$sessionId"
                params={{ projectId, sessionId: session.id }}
                className="block p-4 no-underline text-inherit"
              >
                {session.id.slice(0, 8)}
              </Link>
            </TableCell>
            <TableCell className="p-0">
              <Link
                to="/projects/$projectId/sessions/$sessionId"
                params={{ projectId, sessionId: session.id }}
                className="block p-4 no-underline text-inherit"
              >
                {session.brief}
              </Link>
            </TableCell>
            <TableCell>
              <SessionStatusBadge status={session.status} />
            </TableCell>
            <TableCell className="text-muted-foreground p-0">
              <Link
                to="/projects/$projectId/sessions/$sessionId"
                params={{ projectId, sessionId: session.id }}
                className="block p-4 no-underline text-inherit"
              >
                {new Date(session.createdAt).toLocaleString()}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
