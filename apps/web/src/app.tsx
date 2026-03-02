import { Outlet, useMatches } from "@tanstack/react-router";
import { ThemeToggle } from "./components/theme-toggle.tsx";

export function App() {
  const matches = useMatches();
  const isSessionDetail = matches.some((m) => m.routeId.includes("sessions/$sessionId"));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-1 rounded-full bg-primary" />
            <h1 className="font-display text-xl font-bold tracking-tight">
              Dev<span className="text-primary">Task</span>
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {isSessionDetail ? (
        <main className="flex-1 min-h-0">
          <Outlet />
        </main>
      ) : (
        <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6">
          <Outlet />
        </main>
      )}
    </div>
  );
}
