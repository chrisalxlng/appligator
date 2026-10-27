import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from "@tanstack/react-router";
import { ApplicationsPage } from "./pages/ApplicationsPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { JobsPage } from "./pages/JobsPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { AppShell } from "./shell/AppShell.tsx";

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "shell",
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
  shellRoute.addChildren([homeRoute, jobsRoute, applicationsRoute, profileRoute]),
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history });
}
