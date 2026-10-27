export type Language = "de" | "en";

export function detectLanguage(browserLanguage: string): Language {
  return browserLanguage.toLowerCase().startsWith("de") ? "de" : "en";
}
