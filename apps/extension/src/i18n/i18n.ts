import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { de } from "./de.ts";
import { en } from "./en.ts";

export const resources = {
  de: { translation: de },
  en: { translation: en },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: navigator.language,
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.resolvedLanguage ?? "en";
