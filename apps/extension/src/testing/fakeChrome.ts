import { vi } from "vite-plus/test";

type Changes = Record<string, chrome.storage.StorageChange>;

function fakeStorageArea() {
  const items = new Map<string, unknown>();
  const listeners = new Set<(changes: Changes) => void>();
  const notify = (changes: Changes) => listeners.forEach((listener) => listener(changes));

  return {
    get: vi.fn(async (key: string) => (items.has(key) ? { [key]: items.get(key) } : {})),
    set: vi.fn(async (values: Record<string, unknown>) => {
      const changes: Changes = {};
      for (const [key, value] of Object.entries(values)) {
        changes[key] = { oldValue: items.get(key), newValue: structuredClone(value) };
        items.set(key, changes[key].newValue);
      }
      notify(changes);
    }),
    remove: vi.fn(async (key: string) => {
      const oldValue = items.get(key);
      items.delete(key);
      notify({ [key]: { oldValue } });
    }),
    onChanged: {
      addListener: (listener: (changes: Changes) => void) => listeners.add(listener),
      removeListener: (listener: (changes: Changes) => void) => listeners.delete(listener),
    },
  };
}

export function installFakeChrome() {
  const fakeChrome = {
    storage: { local: fakeStorageArea(), session: fakeStorageArea() },
    runtime: {
      sendMessage: vi.fn(async () => undefined),
      getURL: (path: string) => `chrome-extension://extension-id/${path}`,
    },
    tabs: { query: vi.fn(async (): Promise<Partial<chrome.tabs.Tab>[]> => []) },
    windows: {
      create: vi.fn(async (_data: chrome.windows.CreateData) => ({})),
      remove: vi.fn(async (_windowId: number) => {}),
    },
    scripting: { executeScript: vi.fn(async (): Promise<{ result?: unknown }[]> => []) },
    action: {
      setBadgeText: vi.fn(async (_details: chrome.action.BadgeTextDetails) => {}),
      setBadgeBackgroundColor: vi.fn(async (_details: chrome.action.BadgeColorDetails) => {}),
    },
  };
  vi.stubGlobal("chrome", fakeChrome);
  return fakeChrome;
}
