import { useState } from "react";
import { api } from "../api-client.ts";
import { Input } from "./ui/input.tsx";
import { Button } from "./ui/button.tsx";

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
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a reply..."
        disabled={submitting}
        className="flex-1"
      />
      <Button type="submit" variant="secondary" disabled={submitting || !message.trim()}>
        Send
      </Button>
    </form>
  );
}
