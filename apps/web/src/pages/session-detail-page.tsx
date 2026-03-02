import { useLoaderData } from "@tanstack/react-router";
import { SessionDetail } from "../components/session-detail.tsx";
import { sessionDetailRoute } from "../routes.ts";

export function SessionDetailPage() {
  const [, session] = useLoaderData({ from: sessionDetailRoute.id });

  return <SessionDetail session={session} />;
}
