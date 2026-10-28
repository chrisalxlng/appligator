import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";

export function respondingModel(text = "OK") {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

export function failingModel(statusCode: number) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw new APICallError({
        message: `Provider responded with ${statusCode}`,
        url: "https://provider.test",
        requestBodyValues: {},
        statusCode,
        isRetryable: false,
      });
    },
  });
}
