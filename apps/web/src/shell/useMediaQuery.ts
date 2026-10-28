import { useSyncExternalStore } from "react";

const desktopQuery = "(width >= 768px)";
const wideQuery = "(width >= 1200px)";
const finePointerQuery = "(hover: hover) and (pointer: fine)";

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

export function useIsDesktop() {
  return useMediaQuery(desktopQuery);
}

export function useIsWide() {
  return useMediaQuery(wideQuery);
}

export function useHasFinePointer() {
  return useMediaQuery(finePointerQuery);
}
