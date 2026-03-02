import type { SdkSystemInitMessage } from "../../lib/sdk-message-types.ts";

export function SystemInitMessage({ message }: { message: SdkSystemInitMessage }) {
  return (
    <div className="text-xs text-muted-foreground space-y-0.5">
      <p>
        Model: <span className="text-foreground">{message.model}</span>
        {message.tools.length > 0 && (
          <span className="ml-3">
            Tools: <span className="text-foreground">{message.tools.length}</span>
          </span>
        )}
      </p>
      {message.cwd && <p className="font-mono truncate">cwd: {message.cwd}</p>}
    </div>
  );
}
