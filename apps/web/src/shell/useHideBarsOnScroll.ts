import { useLocation } from "@tanstack/react-router";
import { useEffect, type RefObject } from "react";

const hideDistance = 80;
const settleDelay = 150;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function scrollRange() {
  const { scrollHeight, clientHeight } = document.documentElement;
  const end = scrollHeight - clientHeight;
  // Overscrolling past either end bounces back, which must not count as scrolling the other way.
  return { position: clamp(window.scrollY, 0, end), end };
}

// Sets --bars-hidden (0 to 1) in step with the scrolled distance and, once scrolling pauses or
// reaches either end, data-bars-settling while the bars move fully in or out of view.
export function useHideBarsOnScroll(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const { pathname } = useLocation();

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let hidden = 0;
    let lastPosition = scrollRange().position;
    let settleTimeout: ReturnType<typeof setTimeout> | undefined;

    function render() {
      element!.style.setProperty("--bars-hidden", String(hidden));
    }

    function settle(target = Math.round(hidden)) {
      hidden = target;
      element!.dataset.barsSettling = "";
      render();
    }

    function follow() {
      const { position, end } = scrollRange();
      const delta = position - lastPosition;
      lastPosition = position;
      clearTimeout(settleTimeout);

      if (position === 0 || position === end) {
        settle(0);
        return;
      }

      hidden = clamp(hidden + delta / hideDistance, 0, 1);
      delete element!.dataset.barsSettling;
      render();
      settleTimeout = setTimeout(settle, settleDelay);
    }

    render();
    window.addEventListener("scroll", follow, { passive: true });
    return () => {
      window.removeEventListener("scroll", follow);
      clearTimeout(settleTimeout);
      element.style.removeProperty("--bars-hidden");
      delete element.dataset.barsSettling;
    };
  }, [ref, enabled, pathname]);
}
