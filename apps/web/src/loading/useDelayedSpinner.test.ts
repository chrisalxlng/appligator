import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { useDelayedSpinner } from "./useDelayedSpinner.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderSpinner() {
  return renderHook(({ isLoading }) => useDelayedSpinner(isLoading), {
    initialProps: { isLoading: true },
  });
}

test("stays hidden when loading finishes quickly", () => {
  const { result, rerender } = renderSpinner();

  act(() => {
    vi.advanceTimersByTime(300);
  });
  rerender({ isLoading: false });
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(result.current).toBe(false);
});

test("shows the spinner once loading takes longer than the delay", () => {
  const { result } = renderSpinner();

  act(() => {
    vi.advanceTimersByTime(399);
  });
  expect(result.current).toBe(false);

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(result.current).toBe(true);
});

test("keeps the spinner visible for a minimum time", () => {
  const { result, rerender } = renderSpinner();

  act(() => {
    vi.advanceTimersByTime(450);
  });
  rerender({ isLoading: false });
  act(() => {
    vi.advanceTimersByTime(249);
  });
  expect(result.current).toBe(true);

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(result.current).toBe(false);
});

test("hides the spinner right away when it was visible long enough", () => {
  const { result, rerender } = renderSpinner();

  act(() => {
    vi.advanceTimersByTime(1000);
  });
  rerender({ isLoading: false });
  act(() => {
    vi.advanceTimersByTime(0);
  });

  expect(result.current).toBe(false);
});
