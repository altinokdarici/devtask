import type { SessionStatus } from "@devtask/api-types";

const statusStyles: Record<SessionStatus, string> = {
  queued: "bg-gray-700 text-gray-300",
  provisioning: "bg-blue-900 text-blue-300",
  running: "bg-green-900 text-green-300",
  waiting_for_input: "bg-yellow-900 text-yellow-300",
  done: "bg-gray-800 text-gray-400",
  failed: "bg-red-900 text-red-300",
  cancelled: "bg-gray-800 text-gray-500",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
