import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { Footer } from "./Footer.tsx";

afterEach(() => {
  vi.useRealTimers();
});

test("shows the copyright of the current year and the app version", () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2031-03-01") });

  render(<Footer />);

  expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2031 Christopher Lang • v1.2.3");
});
