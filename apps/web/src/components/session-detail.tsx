import type { Session } from "@devtask/api-types";
import { useSessionEvents } from "../hooks/use-session-events.ts";
import { SessionStatusBadge } from "./session-status-badge.tsx";
import { AgentMessageLog } from "./agent-message-log.tsx";
import { ReplyForm } from "./reply-form.tsx";
import { api } from "../api-client.ts";
import { Button } from "./ui/button.tsx";
import { Card, CardContent } from "./ui/card.tsx";

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
    await api.cancelSession(session.id);
    onRefresh();
  }

  async function handleComplete() {
    await api.completeSession(session.id);
    onRefresh();
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        &larr; Back to sessions
      </Button>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{session.brief}</h2>
            <SessionStatusBadge status={currentStatus} />
          </div>
          <div className="text-xs text-muted-foreground font-mono space-y-1">
            <p>ID: {session.id}</p>
            <p>Provider: {session.provider}</p>
            <p>Created: {new Date(session.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(session.updatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {isActive && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleComplete}
            className="border-green-800 text-green-400 hover:bg-green-950 hover:text-green-300"
          >
            Complete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300"
          >
            Cancel
          </Button>
        </div>
      )}

      {currentStatus === "waiting_for_input" && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Reply</h3>
          <ReplyForm sessionId={session.id} onReplied={onRefresh} />
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2">Agent Messages</h3>
        <AgentMessageLog messages={messages} />
      </div>
    </div>
  );
}
