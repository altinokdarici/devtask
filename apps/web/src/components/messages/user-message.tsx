import type { SdkUserMessage } from "../../lib/sdk-message-types.ts";

export function UserMessage({ message }: { message: SdkUserMessage }) {
  return (
    <div className="border-l-2 border-primary pl-3">
      <p className="whitespace-pre-wrap text-sm text-foreground">{message.content}</p>
    </div>
  );
}
