import { useRouteContext } from "@tanstack/react-router";

export function useAuth() {
  return useRouteContext({ from: "/shell", select: (context) => context.auth });
}
