import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { createFakeApi, jobFixture } from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const screenHeight = 800;

beforeEach(() => {
  window.innerHeight = screenHeight;
  window.scrollTo = vi.fn();
  createFakeApi([jobFixture]);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.scrollY = 0;
});

// The router scrolls the window to the top on navigation as well.
function forgetRouterScrolling() {
  vi.mocked(window.scrollTo).mockClear();
}

function scrollWindowTo(position: number) {
  act(() => {
    window.scrollY = position;
    window.dispatchEvent(new Event("scroll"));
  });
}

function scrollElementTo(element: HTMLElement, position: number) {
  vi.spyOn(element, "clientHeight", "get").mockReturnValue(screenHeight);
  const scrollTo = vi.fn();
  element.scrollTo = scrollTo;
  act(() => {
    element.scrollTop = position;
    element.dispatchEvent(new Event("scroll"));
  });
  return scrollTo;
}

const backToTop = () => screen.queryByRole("button", { name: "Back to top" });

test.each(["mobile", "tablet"] as const)(
  "offers to scroll back to the top only after two screen heights on %s",
  async (viewport) => {
    renderApp(`/jobs/${jobFixture.id}`, { viewport });
    await screen.findByRole("article");
    forgetRouterScrolling();

    scrollWindowTo(2 * screenHeight);
    expect(backToTop()).toBeNull();

    scrollWindowTo(2 * screenHeight + 1);
    await userEvent.click(backToTop()!);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
    scrollWindowTo(0);
    expect(backToTop()).toBeNull();
  },
);

test("scrolls smoothly unless motion is reduced", async () => {
  const matchMedia = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query.includes("reduced-motion") ? ({ matches: false } as MediaQueryList) : matchMedia(query),
  );
  renderApp("/jobs", { viewport: "mobile" });
  await screen.findByRole("link", { name: /Lead Developer Frontend/ });
  forgetRouterScrolling();

  scrollWindowTo(3 * screenHeight);
  await userEvent.click(backToTop()!);

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
});

test("scrolls the list and the opened job on their own on wide screens", async () => {
  renderApp(`/jobs/${jobFixture.id}`, { viewport: "desktop" });
  const detail = (await screen.findByRole("article")).parentElement!;
  const list = screen
    .getByRole("heading", { level: 1, name: "Jobs" })
    .closest("header")!.parentElement!;
  forgetRouterScrolling();

  const scrollDetail = scrollElementTo(detail, 3 * screenHeight);
  await userEvent.click(backToTop()!);
  expect(scrollDetail).toHaveBeenCalledWith({ top: 0, behavior: "instant" });

  scrollElementTo(detail, 0);
  const scrollList = scrollElementTo(list, 3 * screenHeight);
  await userEvent.click(backToTop()!);
  expect(scrollList).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  expect(window.scrollTo).not.toHaveBeenCalled();
});
