import { useState } from "react";
import type { Session } from "@devtask/api-types";
import { useSessions } from "./hooks/use-sessions.ts";
import { SessionList } from "./components/session-list.tsx";
import { SessionDetail } from "./components/session-detail.tsx";
import { CreateSessionForm } from "./components/create-session-form.tsx";

export function App() {
  const { sessions, loading, error, refetch } = useSessions();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">DevTask</h1>
      <p className="mt-1 mb-6 text-gray-400 text-sm">Parallel AI task sessions for developers.</p>

      {selectedSession ? (
        <SessionDetail
          session={selectedSession}
          onBack={() => setSelectedSession(null)}
          onRefresh={() => {
            refetch();
            setSelectedSession(null);
          }}
        />
      ) : (
        <div className="space-y-6">
          <CreateSessionForm onCreated={refetch} />

          {loading && <p className="text-gray-500 text-sm">Loading sessions...</p>}
          {error && <p className="text-red-400 text-sm">Error: {error}</p>}
          {!loading && !error && <SessionList sessions={sessions} onSelect={setSelectedSession} />}
        </div>
      )}
    </div>
  );
}
