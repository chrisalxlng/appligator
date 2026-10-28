import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from "@tanstack/react-router";
import { createQueryClient } from "./api/queryClient.ts";
import type { Auth } from "./auth/authenticate.ts";
import { JobsIndex } from "./jobs/JobsIndex.tsx";
import { ApplicationsPage } from "./pages/ApplicationsPage.tsx";
import { ErrorPage } from "./pages/ErrorPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { JobDetailPage } from "./pages/JobDetailPage.tsx";
import { JobsPage } from "./pages/JobsPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { AppShell } from "./shell/AppShell.tsx";

interface RouterContext {
  authentication: Promise<Auth>;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "shell",
  beforeLoad: async ({ context }) => ({ auth: await context.authentication }),
  component: AppShell,
});

const homeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/",
  component: HomePage,
});

const jobsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/jobs",
  component: JobsPage,
});

const jobsIndexRoute = createRoute({
  getParentRoute: () => jobsRoute,
  path: "/",
  component: JobsIndex,
});

const jobDetailRoute = createRoute({
  getParentRoute: () => jobsRoute,
  path: "$jobId",
  component: JobDetailPage,
});

const applicationsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/applications",
  component: ApplicationsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/profile",
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([
    homeRoute,
    jobsRoute.addChildren([jobsIndexRoute, jobDetailRoute]),
    applicationsRoute,
    profileRoute,
  ]),
]);

interface AppRouterOptions {
  history?: RouterHistory;
  queryClient?: QueryClient;
}

export function createAppRouter(
  authentication: Promise<Auth>,
  { history, queryClient = createQueryClient() }: AppRouterOptions = {},
) {
  return createRouter({
    routeTree,
    history,
    context: { authentication },
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}
