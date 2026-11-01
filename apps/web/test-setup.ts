import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vite-plus/test";
import "./src/i18n/i18n.ts";
import { FakeIntersectionObserver } from "./src/testing/fakeIntersectionObserver.ts";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

window.scrollTo = () => {};

vi.stubGlobal("matchMedia", (query: string) => {
  const minWidth = Number(query.match(/width >= (\d+)px/)?.[1] ?? 0);
  return {
    matches: window.innerWidth >= minWidth,
    addEventListener() {},
    removeEventListener() {},
  };
});

// jsdom has no layout, but ProseMirror measures ranges to scroll the selection into view.
Range.prototype.getClientRects = () => Object.assign([], { item: () => null }) as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();
