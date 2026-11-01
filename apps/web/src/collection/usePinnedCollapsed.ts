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

const blockedStorageValues = new Map<string, string>();

function readValue(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return blockedStorageValues.get(key) ?? null;
  }
}

function writeValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    blockedStorageValues.set(key, value);
  }
}

// Kept in the browser, so the list and the index route agree and the choice survives a reload.
export function usePinnedCollapsed(collection: Collection) {
  const key = storageKey(collection);
  const collapsed = useSyncExternalStore(subscribe, () => readValue(key) === "true");

  function setCollapsed(value: boolean) {
    writeValue(key, String(value));
    listeners.forEach((listener) => listener());
  }

  return [collapsed, setCollapsed] as const;
}

export function firstVisibleId(items: { id: string; pinned: boolean }[], pinnedCollapsed: boolean) {
  return items.find((item) => !(pinnedCollapsed && item.pinned))?.id;
}
