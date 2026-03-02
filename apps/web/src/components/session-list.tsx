import type { Session } from "@devtask/api-types";
import { SessionStatusBadge } from "./session-status-badge.tsx";

export function SessionList({
  sessions,
  onSelect,
}: {
  sessions: Session[];
  onSelect: (session: Session) => void;
}) {
  if (sessions.length === 0) {
    return <p className="text-gray-500">No sessions yet.</p>;
  }

  return (
    <table className="w-full text-sm text-left">
      <thead className="text-xs text-gray-500 uppercase border-b border-gray-800">
        <tr>
          <th className="py-2 pr-4">ID</th>
          <th className="py-2 pr-4">Brief</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2 pr-4">Provider</th>
          <th className="py-2">Created</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => (
          <tr
            key={session.id}
            onClick={() => onSelect(session)}
            className="border-b border-gray-800/50 hover:bg-gray-900 cursor-pointer"
          >
            <td className="py-2 pr-4 font-mono text-xs">{session.id.slice(0, 8)}</td>
            <td className="py-2 pr-4">{session.brief}</td>
            <td className="py-2 pr-4">
              <SessionStatusBadge status={session.status} />
            </td>
            <td className="py-2 pr-4 text-gray-400">{session.provider}</td>
            <td className="py-2 text-gray-400">{new Date(session.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
