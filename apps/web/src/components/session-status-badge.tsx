import type { SessionStatus } from "@devtask/api-types";
import { Badge } from "./ui/badge.tsx";
import { cn } from "@/lib/utils";

const statusStyles: Record<SessionStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  provisioning: "bg-blue-950 text-blue-400 border-blue-800",
  running: "bg-green-950 text-green-400 border-green-800",
  waiting_for_input: "bg-yellow-950 text-yellow-400 border-yellow-800",
  done: "bg-muted text-muted-foreground",
  failed: "bg-red-950 text-red-400 border-red-800",
  cancelled: "bg-muted text-muted-foreground/60",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <Badge variant="outline" className={cn("font-mono", statusStyles[status])}>
      {status}
    </Badge>
  );
}
