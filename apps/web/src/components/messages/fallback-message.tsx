import { useState } from "react";
import type { SdkUnknownMessage } from "../../lib/sdk-message-types.ts";
import { Badge } from "../ui/badge.tsx";

export function FallbackMessage({ message }: { message: SdkUnknownMessage }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-xs text-muted-foreground/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:text-muted-foreground transition-colors cursor-pointer"
      >
        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
          {message.type}
        </Badge>
        <span className="text-[10px]">{open ? "\u25BC" : "\u25B6"}</span>
      </button>
      {open && (
        <pre className="mt-1 overflow-x-auto text-[11px] bg-muted/50 p-2 rounded-md">
          {JSON.stringify(message.raw, null, 2)}
        </pre>
      )}
    </div>
  );
}
