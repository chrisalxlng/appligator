import type { AiErrorCode } from "@appligator/shared";
import { APICallError, NoObjectGeneratedError, NoOutputGeneratedError, RetryError } from "ai";

const rejectedStatusCodes = new Set([400, 401, 403, 404]);

export function toAiErrorCode(error: unknown): AiErrorCode {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (NoObjectGeneratedError.isInstance(cause) || NoOutputGeneratedError.isInstance(cause)) {
    return "extractionFailed";
  }
  if (!APICallError.isInstance(cause)) return "providerUnavailable";
  if (cause.statusCode === 429) return "rateLimited";
  if (cause.statusCode && rejectedStatusCodes.has(cause.statusCode)) return "accessRejected";
  return "providerUnavailable";
}

const errorStatus: Record<AiErrorCode, 409 | 422 | 502> = {
  apiKeyRequired: 422,
  accessRejected: 422,
  rateLimited: 422,
  notConfigured: 409,
  providerUnavailable: 502,
  extractionFailed: 502,
  noJobFound: 422,
};

export function aiErrorStatus(code: AiErrorCode) {
  return errorStatus[code];
}
