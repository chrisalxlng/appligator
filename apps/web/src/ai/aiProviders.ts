import type { AiProvider } from "@appligator/shared";

export const aiProviderNames: Record<AiProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  mistral: "Mistral",
};
