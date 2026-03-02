import { useState } from "react";
import { api } from "../api-client.ts";
import { Input } from "./ui/input.tsx";
import { Button } from "./ui/button.tsx";

export function CreateSessionForm({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await api.createSession({ brief: brief.trim(), projectId });
      setBrief("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Describe the task..."
        disabled={submitting}
        className="flex-1"
      />
      <Button type="submit" variant="secondary" disabled={submitting || !brief.trim()}>
        {submitting ? "Creating..." : "Create"}
      </Button>
    </form>
  );
}
