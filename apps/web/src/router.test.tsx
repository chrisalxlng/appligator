import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, expect, test } from "vite-plus/test";
import { createAppRouter } from "./router.tsx";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(<RouterProvider router={router} />);
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
