import { useEffect, useState } from "react";

export function useActiveTab() {
  const [tab, setTab] = useState<chrome.tabs.Tab>();

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
      setTab(activeTab);
    });
  }, []);

  return tab;
}
