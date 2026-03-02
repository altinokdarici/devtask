import { useEffect, useRef, useState } from "react";
import type { AgentMessageSseEvent, Session } from "@devtask/api-types";
import { subscribeToSession } from "../api/subscribe-to-session.ts";

export function useSessionEvents(session: Session) {
  const [currentStatus, setCurrentStatus] = useState(session.status);
  const [messages, setMessages] = useState<AgentMessageSseEvent[]>([]);
  const sessionIdRef = useRef(session.id);

  useEffect(() => {
    if (sessionIdRef.current !== session.id) {
      sessionIdRef.current = session.id;
      setMessages([]);
      setCurrentStatus(session.status);
    }
  }, [session.id, session.status]);

  useEffect(() => {
    const cleanup = subscribeToSession(session.id, (event) => {
      if (event.type === "updated") {
        setCurrentStatus(event.session.status);
      } else if (event.type === "agent_message") {
        setMessages((prev) => [...prev, event]);
      }
    });

    return cleanup;
  }, [session.id]);

  return { currentStatus, messages };
}
