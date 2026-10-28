import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vite-plus/test";
import type { Auth } from "../auth/authenticate.ts";
import { createAppRouter } from "../router.tsx";

export const testAuth: Auth = {
  user: { name: "Jane Doe", email: "jane@example.com" },
  getToken: async () => "token",
  logout: vi.fn(),
};

const viewportWidths = { mobile: 402, tablet: 1040, desktop: 1280 };

interface RenderAppOptions {
  viewport?: keyof typeof viewportWidths;
  authentication?: Promise<Auth>;
}

export function renderApp(
  path: string,
  { viewport = "desktop", authentication = Promise.resolve(testAuth) }: RenderAppOptions = {},
) {
  window.innerWidth = viewportWidths[viewport];
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter(authentication, {
    history: createMemoryHistory({ initialEntries: [path] }),
    queryClient,
  });
  render(<RouterProvider router={router} />);
  return router;
}
