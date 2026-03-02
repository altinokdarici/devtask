import type { SdkResultMessage } from "../../lib/sdk-message-types.ts";
import { formatDuration } from "../../lib/format-duration.ts";
import { formatCost } from "../../lib/format-cost.ts";

export function ResultMessage({ message }: { message: SdkResultMessage }) {
  if (message.isError) {
    return (
      <div className="text-sm text-destructive space-y-1">
        <p className="font-semibold">Error</p>
        {message.errors.map((err, i) => (
          <p key={i} className="text-xs">
            {err}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs text-[#098658] dark:text-[#98c379]">
      <span>Turn complete</span>
      {message.durationMs > 0 && <span>{formatDuration(message.durationMs)}</span>}
      {message.totalCostUsd > 0 && <span>{formatCost(message.totalCostUsd)}</span>}
    </div>
  );
}
