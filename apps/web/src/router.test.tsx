import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { afterEach, expect, test, vi } from "vite-plus/test";
import type { Auth } from "./auth/authenticate.ts";
import { AuthContext } from "./auth/AuthContext.ts";
import { createAppRouter } from "./router.tsx";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

function renderAt(path: string) {
  const auth: Auth = {
    user: { name: "Jane Doe", email: "jane@example.com" },
    logout: vi.fn(),
  };
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(
    <AuthContext value={auth}>
      <RouterProvider router={router} />
    </AuthContext>,
  );
  return auth;
}

test("renders the page for the current route", async () => {
  renderAt("/jobs");

  expect(await screen.findByRole("heading", { name: "Jobs" })).toBeInTheDocument();
});

test("marks the current route as active in the navigation", async () => {
  renderAt("/applications");

  const [sidebarLink] = await screen.findAllByRole("link", { name: "Applications" });
  const [homeLink] = screen.getAllByRole("link", { name: "Home" });

  expect(sidebarLink).toHaveAttribute("data-status", "active");
  expect(homeLink).not.toHaveAttribute("data-status");
});

test("renders the not found page for unknown routes", async () => {
  renderAt("/does-not-exist");

  expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open home page" })).toHaveAttribute("href", "/");
});

test("links the app logo to the home page", async () => {
  renderAt("/profile");

  const [logoLink] = await screen.findAllByRole("link", { name: "Appligator home page" });

  expect(logoLink).toHaveAttribute("href", "/");
});

test("renders German texts when the language is German", async () => {
  await i18n.changeLanguage("de");
  renderAt("/jobs");

  expect(await screen.findByRole("heading", { name: "Stellen" })).toBeInTheDocument();
});

test("shows the logged in user on the profile page", async () => {
  renderAt("/profile");

  const account = await screen.findByRole("region", { name: "Account" });

  expect(account).toHaveTextContent("Jane Doe");
  expect(account).toHaveTextContent("jane@example.com");
});

test("signs the user out from the profile page", async () => {
  const { logout } = renderAt("/profile");

  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));

  expect(logout).toHaveBeenCalledOnce();
});
