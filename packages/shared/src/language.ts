import type { AiLanguage } from "./ai.ts";

export function detectLanguage(browserLanguage: string): AiLanguage {
  return browserLanguage.toLowerCase().startsWith("de") ? "de" : "en";
}
