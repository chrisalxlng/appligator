import { expect, test } from "vite-plus/test";
import { detectLanguage } from "./detectLanguage.ts";

test.each(["de", "de-DE", "de-AT", "DE-ch"])("uses German for %s", (browserLanguage) => {
  expect(detectLanguage(browserLanguage)).toBe("de");
});

test.each(["en-US", "fr-FR", "nl", ""])("falls back to English for %s", (browserLanguage) => {
  expect(detectLanguage(browserLanguage)).toBe("en");
});
