import type { Session } from "@devtask/api-types";
import { useSessionEvents } from "../hooks/use-session-events.ts";
import { SessionStatusBadge } from "./session-status-badge.tsx";
import { AgentMessageLog } from "./agent-message-log.tsx";
import { ReplyForm } from "./reply-form.tsx";
import { cancelSession } from "../api/cancel-session.ts";
import { completeSession } from "../api/complete-session.ts";

export function SessionDetail({
  session,
  onBack,
  onRefresh,
}: {
  session: Session;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const { currentStatus, messages } = useSessionEvents(session);

  const isActive =
    currentStatus !== "done" && currentStatus !== "failed" && currentStatus !== "cancelled";

  async function handleCancel() {
    await cancelSession(session.id);
    onRefresh();
  }

  async function handleComplete() {
    await completeSession(session.id);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-gray-400 hover:text-gray-200 text-sm">
        &larr; Back to sessions
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">{session.brief}</h2>
          <SessionStatusBadge status={currentStatus} />
        </div>
        <div className="text-xs text-gray-500 font-mono space-y-1">
          <p>ID: {session.id}</p>
          <p>Provider: {session.provider}</p>
          <p>Created: {new Date(session.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      {isActive && (
        <div className="flex gap-2">
          <button
            onClick={handleComplete}
            className="bg-green-900 hover:bg-green-800 text-green-200 text-sm px-3 py-1 rounded"
          >
            Complete
          </button>
          <button
            onClick={handleCancel}
            className="bg-red-900 hover:bg-red-800 text-red-200 text-sm px-3 py-1 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {currentStatus === "waiting_for_input" && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Reply</h3>
          <ReplyForm sessionId={session.id} onReplied={onRefresh} />
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Agent Messages</h3>
        <AgentMessageLog messages={messages} />
      </div>
    </div>
  );
}
