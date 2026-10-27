import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { de } from "./de.ts";
import { detectLanguage } from "./detectLanguage.ts";
import { en } from "./en.ts";

export const resources = {
  de: { translation: de },
  en: { translation: en },
};

const language = detectLanguage(navigator.language);

document.documentElement.lang = language;

void i18n.use(initReactI18next).init({
  resources,
  lng: language,
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false },
});
