import { useSyncExternalStore } from "react";

const desktopQuery = "(width >= 768px)";

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia(desktopQuery);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function isDesktop() {
  return window.matchMedia(desktopQuery).matches;
}

export function useIsDesktop() {
  return useSyncExternalStore(subscribe, isDesktop);
}
