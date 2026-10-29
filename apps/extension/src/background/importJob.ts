import { aiErrorSchema, type JobImportInput } from "@appligator/shared";
import { z } from "zod";
import { apiUrl } from "../config.ts";
import {
  apiImportErrors,
  saveJobImport,
  type JobImport,
  type JobImportError,
} from "../jobImport.ts";
import { removeSession } from "../session.ts";
import { getAccessToken, LoggedOutError } from "./auth.ts";

const badges: Record<JobImport["status"], { text: string; color: string }> = {
  importing: { text: "…", color: "#64696b" },
  done: { text: "✓", color: "#206b6b" },
  failed: { text: "!", color: "#802f2f" },
};

const importedJobSchema = z.object({ id: z.uuid() });

async function showBadge(tabId: number, status: JobImport["status"]) {
  const { text, color } = badges[status];
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text }),
    chrome.action.setBadgeBackgroundColor({ tabId, color }),
  ]);
}

async function readPageHtml(tabId: number) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.documentElement.outerHTML,
  });
  if (typeof injection?.result !== "string") throw new Error("The page could not be read");
  return injection.result;
}

async function errorCode(response: Response): Promise<JobImportError> {
  const body: unknown = await response.json().catch(() => undefined);
  const code = aiErrorSchema.safeParse(body).data?.error;
  return apiImportErrors.find((importError) => importError === code) ?? "failed";
}

async function postJobImport(input: JobImportInput): Promise<JobImport> {
  const response = await fetch(`${apiUrl}/ai/job-import`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await getAccessToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401) {
    await removeSession();
    return { status: "failed", error: "loggedOut" };
  }
  if (!response.ok) return { status: "failed", error: await errorCode(response) };

  const job = importedJobSchema.parse(await response.json());
  return { status: "done", jobId: job.id };
}

async function runJobImport(tabId: number, link: string): Promise<JobImport> {
  let html;
  try {
    html = await readPageHtml(tabId);
  } catch {
    return { status: "failed", error: "pageUnreadable" };
  }

  try {
    return await postJobImport({ link, html });
  } catch (error) {
    return { status: "failed", error: error instanceof LoggedOutError ? "loggedOut" : "failed" };
  }
}

export async function importJob(tabId: number, link: string) {
  await saveJobImport(link, { status: "importing", startedAt: Date.now() });
  await showBadge(tabId, "importing");

  const jobImport = await runJobImport(tabId, link);
  await saveJobImport(link, jobImport);
  await showBadge(tabId, jobImport.status);
}

export async function clearBadge(tabId: number) {
  await chrome.action.setBadgeText({ tabId, text: "" });
}
