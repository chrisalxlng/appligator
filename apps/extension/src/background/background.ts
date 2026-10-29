import type { Message } from "../messages.ts";
import { login, logout } from "./auth.ts";
import { clearBadge, importJob } from "./importJob.ts";

const keepAliveIntervalMs = 20_000;

// Chrome stops a service worker after 30 seconds without extension events or API calls,
// but the AI analysis of a job import can take longer.
async function keepAlive(task: Promise<void>) {
  const interval = setInterval(() => void chrome.runtime.getPlatformInfo(), keepAliveIntervalMs);
  try {
    await task;
  } finally {
    clearInterval(interval);
  }
}

async function handleMessage(message: Message) {
  if (message.type === "login") return login();
  if (message.type === "logout") return logout();
  return keepAlive(importJob(message.tabId, message.link));
}

chrome.runtime.onMessage.addListener((message: Message) => {
  handleMessage(message).catch((error: unknown) => console.error(error));
});

chrome.tabs.onUpdated.addListener((tabId, { status }) => {
  if (status === "loading") void clearBadge(tabId);
});
