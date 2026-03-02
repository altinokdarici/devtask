import { useState } from "react";
import { api } from "../api-client.ts";

export function ReplyForm({ sessionId, onReplied }: { sessionId: string; onReplied: () => void }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await api.replyToSession(sessionId, message.trim());
      setMessage("");
      onReplied();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a reply..."
        className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting || !message.trim()}
        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-4 py-2 rounded"
      >
        Send
      </button>
    </form>
  );
}
