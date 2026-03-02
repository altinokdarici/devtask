import { useCallback, useEffect, useState } from "react";
import type { Session } from "@devtask/api-types";
import { fetchSessions } from "../api/fetch-sessions.ts";

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchSessions();
      setSessions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sessions, loading, error, refetch };
}
