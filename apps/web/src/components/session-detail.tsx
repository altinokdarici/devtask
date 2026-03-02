import type { Session } from "@devtask/api-types";
import { Link, useParams } from "@tanstack/react-router";
import { useSessionEvents } from "../hooks/use-session-events.ts";
import { SessionStatusBadge } from "./session-status-badge.tsx";
import { AgentMessageLog } from "./agent-message-log.tsx";
import { ReplyForm } from "./reply-form.tsx";
import { api } from "../api-client.ts";
import { Button } from "./ui/button.tsx";
import { Card, CardContent } from "./ui/card.tsx";
import { router } from "../routes.ts";

export function SessionDetail({ session }: { session: Session }) {
  const { projectId } = useParams({ strict: false });
  const { currentStatus, messages } = useSessionEvents(session);

  const isActive =
    currentStatus !== "done" && currentStatus !== "failed" && currentStatus !== "cancelled";

  async function handleCancel() {
    await api.cancelSession(session.id);
    router.invalidate();
  }

  async function handleComplete() {
    await api.completeSession(session.id);
    router.invalidate();
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/projects/$projectId" params={{ projectId: projectId! }}>
          &larr; Back to sessions
        </Link>
      </Button>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold">{session.brief}</h2>
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
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-green-800 dark:text-[#98c379] dark:hover:bg-green-950/50"
          >
            Complete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-[#e06c75] dark:hover:bg-red-950/50"
          >
            Cancel
          </Button>
        </div>
      )}

      {currentStatus === "waiting_for_input" && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Reply</h3>
          <ReplyForm sessionId={session.id} onReplied={() => router.invalidate()} />
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2">Agent Messages</h3>
        <AgentMessageLog messages={messages} />
      </div>
    </div>
  );
}
