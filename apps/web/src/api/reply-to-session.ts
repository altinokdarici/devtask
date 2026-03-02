import type { ReplyBody } from "@devtask/api-types";

export async function replyToSession(id: string, body: ReplyBody): Promise<void> {
  const res = await fetch(`/sessions/${id}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to reply to session: ${res.status}`);
  }
}
