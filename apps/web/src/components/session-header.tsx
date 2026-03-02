import type { Session, SessionStatus } from "@devtask/api-types";
import { Link } from "@tanstack/react-router";
import { SessionStatusBadge } from "./session-status-badge.tsx";
import { Button } from "./ui/button.tsx";

interface SessionHeaderProps {
  session: Session;
  projectId: string;
  currentStatus: SessionStatus;
  isActive: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export function SessionHeader({
  session,
  projectId,
  currentStatus,
  isActive,
  onComplete,
  onCancel,
}: SessionHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/projects/$projectId" params={{ projectId }}>
          &larr;
        </Link>
      </Button>

      <h2 className="font-display text-sm font-bold truncate">{session.brief}</h2>

      <SessionStatusBadge status={currentStatus} />

      <div className="ml-auto flex gap-2">
        {isActive && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onComplete}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-green-800 dark:text-[#98c379] dark:hover:bg-green-950/50"
            >
              Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-[#e06c75] dark:hover:bg-red-950/50"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
