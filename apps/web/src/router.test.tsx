import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vite-plus/test";
import { createAppRouter } from "./router.tsx";

function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(<RouterProvider router={router} />);
}

test("renders the page for the current route", async () => {
  renderAt("/jobs");

  expect(await screen.findByRole("heading", { name: "Stellen" })).toBeInTheDocument();
});

test("marks the current route as active in the navigation", async () => {
  renderAt("/applications");

  const [sidebarLink] = await screen.findAllByRole("link", { name: "Bewerbungen" });
  const [homeLink] = screen.getAllByRole("link", { name: "Home" });

  expect(sidebarLink).toHaveAttribute("data-status", "active");
  expect(homeLink).not.toHaveAttribute("data-status");
});

test("renders the not found page for unknown routes", async () => {
  renderAt("/does-not-exist");

  expect(await screen.findByRole("heading", { name: "Seite nicht gefunden" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Startseite öffnen" })).toHaveAttribute("href", "/");
});

test("links the app logo to the home page", async () => {
  renderAt("/profile");

  const [logoLink] = await screen.findAllByRole("link", { name: "Appligator Startseite" });

  expect(logoLink).toHaveAttribute("href", "/");
});
