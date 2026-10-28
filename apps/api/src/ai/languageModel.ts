import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import type { AiProvider } from "@appligator/shared";
import { generateText, type LanguageModel } from "ai";

export interface AiAccess {
  provider: AiProvider;
  model: string;
  apiKey: string;
}

export type CreateLanguageModel = (access: AiAccess) => LanguageModel;

const providerFactories = {
  openai: createOpenAI,
  anthropic: createAnthropic,
  google: createGoogle,
  mistral: createMistral,
} satisfies Record<AiProvider, (settings: { apiKey: string }) => (model: string) => LanguageModel>;

export const createLanguageModel: CreateLanguageModel = ({ provider, model, apiKey }) =>
  providerFactories[provider]({ apiKey })(model);

export async function verifyLanguageModel(model: LanguageModel) {
  await generateText({
    model,
    prompt: "Reply with OK.",
    maxOutputTokens: 16,
    maxRetries: 0,
    timeout: 20_000,
  });
}
