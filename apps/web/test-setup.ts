import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vite-plus/test";
import "./src/i18n/i18n.ts";

afterEach(cleanup);

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.stubGlobal("matchMedia", (query: string) => {
  const minWidth = Number(query.match(/width >= (\d+)px/)?.[1] ?? 0);
  return {
    matches: window.innerWidth >= minWidth,
    addEventListener() {},
    removeEventListener() {},
  };
});
