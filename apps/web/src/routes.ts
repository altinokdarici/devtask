import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { api } from "./api-client.ts";
import { App } from "./app.tsx";
import { ProjectsPage } from "./pages/projects-page.tsx";
import { ProjectSessionsPage } from "./pages/project-sessions-page.tsx";
import { SessionDetailPage } from "./pages/session-detail-page.tsx";

export const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/projects" });
  },
});

export const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
  loader: () => api.listProjects(),
});

export const projectSessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId",
  component: ProjectSessionsPage,
  loader: ({ params }) =>
    Promise.all([api.getProject(params.projectId), api.listSessions(params.projectId)]),
});

export const sessionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId/sessions/$sessionId",
  component: SessionDetailPage,
  loader: ({ params }) =>
    Promise.all([api.getProject(params.projectId), api.getSession(params.sessionId)]),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectsRoute,
  projectSessionsRoute,
  sessionDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
