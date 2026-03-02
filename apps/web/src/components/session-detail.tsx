import type { Session } from "@devtask/api-types";
import { useParams } from "@tanstack/react-router";
import { useSessionEvents } from "../hooks/use-session-events.ts";
import { SessionHeader } from "./session-header.tsx";
import { MessageFeed } from "./message-feed.tsx";
import { ReplyForm } from "./reply-form.tsx";
import { api } from "../api-client.ts";
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
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <SessionHeader
        session={session}
        projectId={projectId!}
        currentStatus={currentStatus}
        isActive={isActive}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />

      <MessageFeed messages={messages} />

      <div className="border-t bg-card p-3 shrink-0">
        <ReplyForm
          sessionId={session.id}
          onReplied={() => router.invalidate()}
          disabled={currentStatus !== "waiting_for_input"}
        />
      </div>
    </div>
  );
}
