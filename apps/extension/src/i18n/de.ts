import type { Translations } from "./en.ts";

export const de: Translations = {
  login: {
    title: "Anmelden",
    description:
      "Verbinde deine Chrome Extension mit Appligator, um Stellenanzeigen direkt per Klick aus dem Browser zu analysieren und übermitteln.",
    submit: "Anmelden",
  },
  jobImport: {
    title: "Stelle übermitteln",
    submit: "Übermitteln",
    importing: "Die Stelle wird im Hintergrund importiert. Du kannst dieses Fenster schließen.",
    done: "Stelle importiert",
    open: "In Appligator öffnen",
    unsupportedPage: "Von dieser Seite können keine Stellen übermittelt werden.",
    logout: "Abmelden",
    errors: {
      notConfigured: "Richte zuerst einen KI-Zugang in deinem Appligator-Profil ein.",
      accessRejected: "Der Anbieter hat deinen KI-Zugang abgelehnt. Prüfe ihn in deinem Profil.",
      rateLimited:
        "Dein Schlüssel hat sein Limit erreicht. Prüfe Guthaben und Limits beim Anbieter.",
      providerUnavailable:
        "Der Anbieter ist gerade nicht erreichbar. Bitte versuche es später erneut.",
      extractionFailed:
        "Die Antwort der KI konnte nicht verarbeitet werden. Bitte versuche es erneut.",
      noJobFound: "Auf dieser Seite wurde keine Stellenanzeige erkannt.",
      pageUnreadable: "Die Seite konnte nicht gelesen werden. Lade sie neu und versuche es erneut.",
      loggedOut: "Deine Sitzung ist abgelaufen. Bitte versuche es erneut.",
      failed: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    },
  },
};
