import { useState } from "react";
import { createSession } from "../api/create-session.ts";

export function CreateSessionForm({ onCreated }: { onCreated: () => void }) {
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await createSession({ brief: brief.trim() });
      setBrief("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Describe the task..."
        className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting || !brief.trim()}
        className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-4 py-2 rounded"
      >
        {submitting ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
