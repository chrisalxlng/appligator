import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { renderApp } from "../testing/renderApp.tsx";

beforeEach(() => {
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(2000);
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(800);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.scrollY = 0;
});

function scrollTo(position: number) {
  act(() => {
    window.scrollY = position;
    window.dispatchEvent(new Event("scroll"));
  });
}

function pauseScrolling() {
  act(() => {
    vi.advanceTimersByTime(150);
  });
}

async function renderHomePage(viewport: "mobile" | "desktop") {
  renderApp("/", { viewport });
  await screen.findByRole("heading", { level: 1, name: "Home" });
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  return document.querySelector<HTMLElement>("[style*='--bars-hidden']");
}

const barsHidden = (shell: HTMLElement | null) => shell?.style.getPropertyValue("--bars-hidden");

test("hides the bars in step with scrolling down and shows them while scrolling up", async () => {
  const shell = await renderHomePage("mobile");

  scrollTo(40);
  expect(barsHidden(shell)).toBe("0.5");
  scrollTo(200);
  expect(barsHidden(shell)).toBe("1");
  scrollTo(180);
  expect(barsHidden(shell)).toBe("0.75");
});

test("moves the bars fully in or out of view once scrolling pauses", async () => {
  const shell = await renderHomePage("mobile");

  scrollTo(60);
  expect(shell).not.toHaveAttribute("data-bars-settling");
  pauseScrolling();

  expect(barsHidden(shell)).toBe("1");
  expect(shell).toHaveAttribute("data-bars-settling");

  scrollTo(10);
  pauseScrolling();

  expect(barsHidden(shell)).toBe("0");
});

test("shows the bars again at either end of the page", async () => {
  const shell = await renderHomePage("mobile");

  scrollTo(1000);
  expect(barsHidden(shell)).toBe("1");
  scrollTo(1300);
  expect(barsHidden(shell)).toBe("0");
  expect(shell).toHaveAttribute("data-bars-settling");

  scrollTo(500);
  scrollTo(600);
  expect(barsHidden(shell)).toBe("1");
  scrollTo(0);
  expect(barsHidden(shell)).toBe("0");
});

test("keeps the bars in place on desktop", async () => {
  const shell = await renderHomePage("desktop");

  scrollTo(200);

  expect(shell).toBeNull();
});
