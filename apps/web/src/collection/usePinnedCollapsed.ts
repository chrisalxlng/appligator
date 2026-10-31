import { useSyncExternalStore } from "react";

type Collection = "jobs" | "applications";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storageKey(collection: Collection) {
  return `appligator.pinnedCollapsed.${collection}`;
}

// Kept in the browser, so the list and the index route agree and the choice survives a reload.
export function usePinnedCollapsed(collection: Collection) {
  const key = storageKey(collection);
  const collapsed = useSyncExternalStore(subscribe, () => localStorage.getItem(key) === "true");

  function setCollapsed(value: boolean) {
    localStorage.setItem(key, String(value));
    listeners.forEach((listener) => listener());
  }

  return [collapsed, setCollapsed] as const;
}

export function firstVisibleId(items: { id: string; pinned: boolean }[], pinnedCollapsed: boolean) {
  return items.find((item) => !(pinnedCollapsed && item.pinned))?.id;
}
