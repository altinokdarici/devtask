import type { AgentMessageSseEvent } from "@devtask/api-types";

export function AgentMessageLog({ messages }: { messages: AgentMessageSseEvent[] }) {
  if (messages.length === 0) {
    return <p className="text-gray-500 text-sm">No agent messages yet.</p>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {messages.map((msg, i) => (
        <pre
          key={i}
          className="bg-gray-900 border border-gray-800 rounded p-2 text-xs font-mono text-gray-300 overflow-x-auto"
        >
          {JSON.stringify(msg.message, null, 2)}
        </pre>
      ))}
    </div>
  );
}
