import type { AiErrorCode } from "@appligator/shared";
import { ApiError } from "../api/apiClient.ts";

const accessErrors = [
  "apiKeyRequired",
  "accessRejected",
  "rateLimited",
  "providerUnavailable",
] as const satisfies readonly AiErrorCode[];

export function accessError<Fallback extends string>(error: Error, fallback: Fallback) {
  const code = error instanceof ApiError ? error.code : undefined;
  return accessErrors.find((accessError) => accessError === code) ?? fallback;
}
