import type { AgentMessageSseEvent } from "@devtask/api-types";
import { Card, CardContent } from "./ui/card.tsx";

export function AgentMessageLog({ messages }: { messages: AgentMessageSseEvent[] }) {
  if (messages.length === 0) {
    return <p className="text-muted-foreground text-sm">No agent messages yet.</p>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {messages.map((msg, i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
              {JSON.stringify(msg.message, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
