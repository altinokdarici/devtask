import type { SessionSseEvent } from "@devtask/api-types";

export function subscribeToSession(
  id: string,
  onEvent: (event: SessionSseEvent) => void,
): () => void {
  const source = new EventSource(`/sessions/${id}/events`);

  source.addEventListener("updated", (e) => {
    onEvent(JSON.parse(e.data));
  });

  source.addEventListener("agent_message", (e) => {
    onEvent(JSON.parse(e.data));
  });

  return () => source.close();
}
