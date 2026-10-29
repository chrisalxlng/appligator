import type { AiErrorCode } from "@appligator/shared";

export const apiImportErrors = [
  "notConfigured",
  "accessRejected",
  "rateLimited",
  "providerUnavailable",
  "extractionFailed",
  "noJobFound",
] as const satisfies readonly AiErrorCode[];

export type JobImportError =
  | (typeof apiImportErrors)[number]
  | "loggedOut"
  | "pageUnreadable"
  | "failed";

export type JobImport =
  | { status: "importing"; startedAt: number }
  | { status: "done"; jobId: string }
  | { status: "failed"; error: JobImportError };

export function jobImportKey(link: string) {
  return `jobImport:${link}`;
}

export async function saveJobImport(link: string, jobImport: JobImport) {
  await chrome.storage.session.set({ [jobImportKey(link)]: jobImport });
}

const maxImportDurationMs = 2 * 60_000;

export function withStaleImportFailed(jobImport: JobImport): JobImport {
  const isStale =
    jobImport.status === "importing" && Date.now() - jobImport.startedAt > maxImportDurationMs;
  return isStale ? { status: "failed", error: "failed" } : jobImport;
}
