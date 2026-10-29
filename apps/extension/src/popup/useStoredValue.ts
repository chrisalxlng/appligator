import { useEffect, useState } from "react";

type StorageAreaName = "local" | "session";

export function useStoredValue<T>(areaName: StorageAreaName, key: string) {
  const [stored, setStored] = useState<{ key: string; value: T | undefined }>();

  useEffect(() => {
    const area = chrome.storage[areaName];
    let isSubscribed = true;
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (key in changes) setStored({ key, value: changes[key]!.newValue as T | undefined });
    };

    void area.get<Record<string, T>>(key).then((items) => {
      if (isSubscribed) setStored({ key, value: items[key] });
    });
    area.onChanged.addListener(onChanged);
    return () => {
      isSubscribed = false;
      area.onChanged.removeListener(onChanged);
    };
  }, [areaName, key]);

  return stored?.key === key
    ? { isLoaded: true, value: stored.value }
    : { isLoaded: false, value: undefined };
}
