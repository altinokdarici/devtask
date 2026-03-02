import { useEffect, useRef, useState } from "react";
import { api } from "../api-client.ts";
import { Input } from "./ui/input.tsx";
import { Button } from "./ui/button.tsx";

interface ReplyFormProps {
  sessionId: string;
  onReplied: () => void;
  disabled?: boolean;
}

export function ReplyForm({ sessionId, onReplied, disabled = false }: ReplyFormProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && !submitting) {
      inputRef.current?.focus();
    }
  }, [disabled, submitting]);

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
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <span className="text-muted-foreground font-mono text-sm select-none">&gt;</span>
      <Input
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={disabled ? "Waiting for agent..." : "Type a reply..."}
        disabled={submitting || disabled}
        className="flex-1 font-mono"
      />
      <Button
        type="submit"
        variant="secondary"
        disabled={submitting || !message.trim() || disabled}
      >
        Send
      </Button>
    </form>
  );
}
