import { useLocation } from "@tanstack/react-router";
import { useEffect, type RefObject } from "react";

const hideDistance = 80;
const settleDelay = 150;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Overscrolling past either end bounces back, which must not count as scrolling the other way.
function scrollPosition() {
  const { scrollHeight, clientHeight } = document.documentElement;
  return clamp(window.scrollY, 0, scrollHeight - clientHeight);
}

// Sets --bars-hidden (0 to 1) in step with the scrolled distance and, once scrolling pauses,
// data-bars-settling while the bars move fully in or out of view.
export function useHideBarsOnScroll(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const { pathname } = useLocation();

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let hidden = 0;
    let lastPosition = scrollPosition();
    let settleTimeout: ReturnType<typeof setTimeout> | undefined;

    function render() {
      element!.style.setProperty("--bars-hidden", String(hidden));
    }

    function settle() {
      hidden = Math.round(hidden);
      element!.dataset.barsSettling = "";
      render();
    }

    function follow() {
      const position = scrollPosition();
      hidden = position === 0 ? 0 : clamp(hidden + (position - lastPosition) / hideDistance, 0, 1);
      lastPosition = position;
      delete element!.dataset.barsSettling;
      render();
      clearTimeout(settleTimeout);
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
