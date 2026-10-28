import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { expect, test } from "vite-plus/test";
import { toAiErrorCode } from "./aiError.ts";

function apiCallError(statusCode: number) {
  return new APICallError({
    message: "Failed",
    url: "https://provider.test",
    requestBodyValues: {},
    statusCode,
  });
}

test.each([
  [401, "accessRejected"],
  [403, "accessRejected"],
  [400, "accessRejected"],
  [404, "accessRejected"],
  [429, "rateLimited"],
  [500, "providerUnavailable"],
])("maps a provider response with %i to %s", (statusCode, code) => {
  expect(toAiErrorCode(apiCallError(statusCode))).toBe(code);
});

test("maps the last error after exhausted retries", () => {
  const error = new RetryError({
    message: "Failed after retries",
    reason: "maxRetriesExceeded",
    errors: [apiCallError(500), apiCallError(429)],
  });

  expect(toAiErrorCode(error)).toBe("rateLimited");
});

test("maps an invalid model output to a failed extraction", () => {
  const error = new NoObjectGeneratedError({
    message: "No object generated",
    text: "not json",
    response: { id: "1", timestamp: new Date(), modelId: "model" },
    usage: {
      inputTokens: undefined,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokens: undefined,
      outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
      totalTokens: undefined,
    },
    finishReason: "stop",
  });

  expect(toAiErrorCode(error)).toBe("extractionFailed");
});

test("maps other errors to an unavailable provider", () => {
  expect(toAiErrorCode(new Error("socket hang up"))).toBe("providerUnavailable");
});
