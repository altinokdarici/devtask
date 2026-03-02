export async function cancelSession(id: string): Promise<void> {
  const res = await fetch(`/sessions/${id}/cancel`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to cancel session: ${res.status}`);
  }
}
