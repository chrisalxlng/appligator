import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { JobsPage } from "./pages/JobsPage.tsx";
import { createFakeAiApi } from "./testing/fakeAiApi.ts";
import { createFakeJobsApi } from "./testing/fakeJobsApi.ts";
import { renderApp, testAuth } from "./testing/renderApp.tsx";

vi.mock("./pages/JobsPage.tsx", async (importOriginal) => {
  const { JobsPage } = await importOriginal<typeof import("./pages/JobsPage.tsx")>();
  return { JobsPage: vi.fn(JobsPage) };
});

beforeEach(() => {
  createFakeJobsApi();
  createFakeAiApi();
});

afterEach(async () => {
  await i18n.changeLanguage("en");
  vi.restoreAllMocks();
});

function renderAt(path: string, authentication = Promise.resolve(testAuth)) {
  renderApp(path, { authentication });
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
  expect(document.title).toBe("Page not found • Appligator");
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
  expect(document.title).toBe("Stellen • Appligator");
});

test("shows the logged in user on the profile page", async () => {
  renderAt("/profile");

  const account = await screen.findByRole("region", { name: "Account" });

  expect(account).toHaveTextContent("Jane Doe");
  expect(account).toHaveTextContent("jane@example.com");
  expect(document.title).toBe("Profile • Appligator");
});

test("signs the user out from the profile page", async () => {
  renderAt("/profile");

  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));

  expect(testAuth.logout).toHaveBeenCalledOnce();
});

test("shows the error page when the authentication fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  renderAt("/jobs", Promise.reject(new Error("Keycloak unavailable")));

  expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expect(document.title).toBe("Something went wrong • Appligator");
});

test("shows the error page when a page fails to render", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(JobsPage).mockImplementation(() => {
    throw new Error("Render failed");
  });
  renderAt("/jobs");

  expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

test("reloads the app from the error page", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const reload = vi.fn();
  vi.spyOn(window, "location", "get").mockReturnValue({ reload } as unknown as Location);
  renderAt("/jobs", Promise.reject(new Error("Keycloak unavailable")));

  await userEvent.click(await screen.findByRole("button", { name: "Reload page" }));

  expect(reload).toHaveBeenCalledOnce();
});
