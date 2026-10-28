import type { AiErrorCode } from "@appligator/shared";
import { APICallError } from "ai";

const rejectedStatusCodes = new Set([400, 401, 403, 404]);

export function toAiErrorCode(error: unknown): AiErrorCode {
  if (!APICallError.isInstance(error)) return "providerUnavailable";
  if (error.statusCode === 429) return "rateLimited";
  if (error.statusCode && rejectedStatusCodes.has(error.statusCode)) return "accessRejected";
  return "providerUnavailable";
}

export function aiErrorStatus(code: AiErrorCode) {
  return code === "providerUnavailable" ? 502 : 422;
}
