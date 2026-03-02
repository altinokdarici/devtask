export async function completeSession(id: string): Promise<void> {
  const res = await fetch(`/sessions/${id}/complete`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to complete session: ${res.status}`);
  }
}
