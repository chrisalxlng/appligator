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
    runtime: { sendMessage: vi.fn(async () => undefined) },
    tabs: { query: vi.fn(async (): Promise<Partial<chrome.tabs.Tab>[]> => []) },
    identity: {
      getRedirectURL: () => "https://extension-id.chromiumapp.org/",
      launchWebAuthFlow: vi.fn<(details: { url: string }) => Promise<string | undefined>>(),
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
