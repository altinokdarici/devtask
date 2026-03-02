import type { SdkToolProgressMessage } from "../../lib/sdk-message-types.ts";

export function ToolProgressMessage({ message }: { message: SdkToolProgressMessage }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      <span className="font-mono">{message.toolName}</span>
      <span>{message.elapsedTimeSeconds.toFixed(1)}s</span>
    </div>
  );
}
