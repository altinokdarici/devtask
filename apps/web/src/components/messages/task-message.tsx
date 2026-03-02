import { useState } from "react";
import type { SdkTaskMessage } from "../../lib/sdk-message-types.ts";
import { Badge } from "../ui/badge.tsx";

const COLLAPSE_THRESHOLD = 120;

export function TaskMessage({ message }: { message: SdkTaskMessage }) {
  const isLong = message.description.length > COLLAPSE_THRESHOLD;
  const [open, setOpen] = useState(false);

  return (
    <div className="border-l-2 border-muted pl-3 text-sm text-muted-foreground space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
          {message.subtype.replace("task_", "")}
        </Badge>
        {message.status && <span className="text-xs">{message.status}</span>}
      </div>
      {message.description && (
        <div className="text-xs">
          {isLong && !open ? (
            <p>
              {message.description.slice(0, COLLAPSE_THRESHOLD)}...{" "}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-primary hover:underline cursor-pointer"
              >
                show more
              </button>
            </p>
          ) : (
            <p className="whitespace-pre-wrap">
              {message.description}
              {isLong && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    show less
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
