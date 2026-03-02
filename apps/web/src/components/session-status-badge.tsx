import type { SessionStatus } from "@devtask/api-types";
import { Badge } from "./ui/badge.tsx";
import { cn } from "@/lib/utils";

const statusStyles: Record<SessionStatus, string> = {
  queued: "bg-muted text-muted-foreground",
  provisioning:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-[#61afef] dark:border-blue-900",
  running:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-green-950/50 dark:text-[#98c379] dark:border-green-900",
  waiting_for_input:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-yellow-950/50 dark:text-[#e5c07b] dark:border-yellow-900",
  done: "bg-muted text-muted-foreground",
  failed:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-[#e06c75] dark:border-red-900",
  cancelled: "bg-muted text-muted-foreground/60",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <Badge variant="outline" className={cn("font-mono", statusStyles[status])}>
      {status}
    </Badge>
  );
}
