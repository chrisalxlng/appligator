import type { Translations } from "./en.ts";

export const de: Translations = {
  brand: {
    homeLink: "Appligator Startseite",
  },
  navigation: {
    label: "Hauptnavigation",
    home: "Home",
    jobs: "Stellen",
    applications: "Bewerbungen",
    profile: "Profil",
  },
  jobs: {
    add: "Hinzufügen",
    edit: "Bearbeiten",
    moreActions: "Weitere Aktionen",
    close: "Schließen",
    today: "Heute",
    yesterday: "Gestern",
    loading: "Stellen werden geladen …",
    loadingJob: "Stelle wird geladen …",
    loadingMore: "Weitere Stellen werden geladen …",
    loadError: {
      title: "Stellen konnten nicht geladen werden",
      description: "Prüfe deine Verbindung und versuche es erneut.",
    },
    loadMoreError: {
      title: "Weitere Stellen konnten nicht geladen werden",
      description: "Prüfe deine Verbindung und versuche es erneut.",
    },
    empty: {
      title: "Noch keine Stellen",
      description: "Füge deine erste Stelle hinzu.",
    },
    notFound: {
      title: "Stelle nicht gefunden",
      description: "Diese Stelle gibt es nicht oder sie wurde gelöscht.",
      back: "Zurück zu den Stellen",
    },
    detailLoadError: {
      title: "Stelle konnte nicht geladen werden",
      description: "Prüfe deine Verbindung und versuche es erneut.",
    },
    properties: {
      salary: "Gehalt",
      locations: "Standorte",
      workModel: "Arbeitsmodell",
      employmentType: "Anstellungsart",
      applicationDeadline: "Bewerbungsfrist",
    },
    notSpecified: "Keine Angabe",
    salaryPerPeriod: {
      year: "{{amount}} / Jahr",
      month: "{{amount}} / Monat",
      hour: "{{amount}} / Stunde",
    },
    salaryPeriod: {
      year: "Pro Jahr",
      month: "Pro Monat",
      hour: "Pro Stunde",
    },
    workModel: {
      onSite: "Vor Ort",
      hybrid: "Hybrid",
      remote: "Remote",
    },
    employmentType: {
      fullTime: "Vollzeit",
      partTime: "Teilzeit",
      workingStudent: "Werkstudent",
      internship: "Praktikum",
      freelance: "Freiberuflich",
    },
    form: {
      addTitle: "Stelle hinzufügen",
      editTitle: "Stelle bearbeiten",
      link: "Link",
      description: "Beschreibung",
      summary: "Zusammenfassung",
      company: "Firma",
      position: "Position",
      salary: "Gehalt",
      currency: "Währung",
      salaryMin: "Gehalt von",
      salaryMax: "Gehalt bis",
      salaryTo: "bis",
      salaryPeriod: "Zeitraum",
      locations: "Standorte",
      workModel: "Arbeitsmodell",
      employmentType: "Anstellungsart",
      applicationDeadline: "Bewerbungsfrist",
      selectPlaceholder: "Bitte wählen",
      clear: "Eingabe entfernen",
      add: "Hinzufügen",
      update: "Aktualisieren",
      saveError: "Die Stelle konnte nicht gespeichert werden. Bitte versuche es erneut.",
      errors: {
        companyRequired: "Bitte gib eine Firma an.",
        positionRequired: "Bitte gib eine Position an.",
        tooLong: "Dieser Text ist zu lang. Bitte kürze ihn.",
        linkInvalid: "Bitte gib einen gültigen Link an.",
        salaryIncomplete: "Bitte gib Währung, Betrag und Zeitraum an.",
        salaryRange: "Der Mindestbetrag darf den Höchstbetrag nicht übersteigen.",
        salaryTooHigh: "Dieser Betrag ist zu hoch.",
      },
    },
    analysis: {
      analyzing: "KI analysiert die Stellenanzeige …",
      analyzingHint:
        "Leere Felder werden automatisch ausgefüllt. Du kannst währenddessen weiterarbeiten.",
      filled_one: "KI hat {{count}} Feld ausgefüllt",
      filled_other: "KI hat {{count}} Felder ausgefüllt",
      filledFields: "{{fields}}. Bitte prüfe die Angaben.",
      nothingFilled: "KI hat keine Felder ausgefüllt",
      nothingFilledHint:
        "Bereits ausgefüllte Felder werden nie überschrieben. Um sie neu ausfüllen zu lassen, lösche ihren Inhalt und füge die Stellenanzeige erneut ein.",
      failed: "KI konnte die Stellenanzeige nicht analysieren",
      retry: "Erneut versuchen",
      dismiss: "Ausblenden",
      errors: {
        notConfigured: "Richte zuerst einen KI-Zugang in deinem Profil ein.",
        accessRejected: "Der Anbieter hat deinen KI-Zugang abgelehnt. Prüfe ihn in deinem Profil.",
        rateLimited:
          "Dein Schlüssel hat sein Limit erreicht. Prüfe Guthaben und Limits beim Anbieter.",
        providerUnavailable:
          "Der Anbieter ist gerade nicht erreichbar. Bitte versuche es später erneut.",
        extractionFailed:
          "Die Antwort der KI konnte nicht verarbeitet werden. Bitte versuche es erneut.",
        failed: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
      },
    },
    location: {
      addTitle: "Standort hinzufügen",
      editTitle: "Standort bearbeiten",
      label: "Standort",
      add: "Hinzufügen",
      update: "Aktualisieren",
      remove: "{{location}} entfernen",
      required: "Bitte gib einen Standort an.",
      tooLong: "Dieser Standort ist zu lang. Bitte kürze ihn.",
    },
    toast: {
      added: "Stelle hinzugefügt",
      updated: "Stelle aktualisiert",
      deleted: "Stelle gelöscht",
    },
    delete: {
      action: "Löschen",
      title: "Stelle löschen?",
      description: "„{{position}}“ bei {{company}} wird endgültig gelöscht.",
      confirm: "Löschen",
      cancel: "Abbrechen",
      error: "Die Stelle konnte nicht gelöscht werden. Bitte versuche es erneut.",
    },
    format: {
      bold: "Fett",
      italic: "Kursiv",
      heading: "Überschrift",
      bulletList: "Aufzählung",
      orderedList: "Nummerierte Liste",
    },
  },
  shortcuts: {
    submit: "Strg+Enter",
  },
  profile: {
    account: "Konto",
    logout: "Abmelden",
  },
  ai: {
    title: "KI-Funktionen",
    description:
      "Verbinde deinen eigenen API-Schlüssel, um die KI-Funktionen von Appligator zu nutzen. Du behältst die volle Kontrolle über deine Daten, Modelle und Kosten. Dein Schlüssel wird sicher verschlüsselt gespeichert.",
    loading: "KI-Einstellungen werden geladen …",
    loadError: {
      title: "KI-Einstellungen konnten nicht geladen werden",
      description: "Prüfe deine Verbindung und versuche es erneut.",
    },
    close: "Schließen",
    selectPlaceholder: "Bitte wählen",
    access: {
      add: "Hinzufügen",
      addTitle: "KI-Zugang hinzufügen",
      editTitle: "KI-Zugang bearbeiten",
      provider: "Anbieter",
      model: "Modell",
      apiKey: "Schlüssel",
      updated: "{{time}} aktualisiert",
      submitAdd: "Hinzufügen",
      submitUpdate: "Aktualisieren",
      modelsLoading: "Modelle werden geladen …",
      modelsLoadError: "Die Modelle konnten nicht geladen werden. Bitte versuche es später erneut.",
      errors: {
        providerRequired: "Bitte wähle einen Anbieter.",
        modelRequired: "Bitte wähle ein Modell.",
        apiKeyRequired: "Bitte gib den Schlüssel an.",
        apiKeyRequiredForProvider: "Bitte gib den Schlüssel für den neuen Anbieter an.",
        accessRejected:
          "Der Anbieter hat den Schlüssel oder das Modell abgelehnt. Bitte prüfe deine Angaben.",
        rateLimited:
          "Dein Schlüssel hat sein Limit erreicht. Prüfe Guthaben und Limits beim Anbieter.",
        providerUnavailable:
          "Der Anbieter ist gerade nicht erreichbar. Bitte versuche es später erneut.",
        saveFailed: "Der KI-Zugang konnte nicht gespeichert werden. Bitte versuche es erneut.",
      },
      delete: {
        action: "KI-Zugang löschen",
        title: "KI-Zugang löschen?",
        description:
          "Dein Schlüssel für {{provider}} wird endgültig gelöscht. KI-Funktionen sind danach nicht mehr verfügbar.",
        confirm: "Löschen",
        cancel: "Abbrechen",
        error: "Der KI-Zugang konnte nicht gelöscht werden. Bitte versuche es erneut.",
      },
    },
    language: {
      title: "KI-Sprache bearbeiten",
      label: "Sprache",
      description: "Bestimmt die Sprache, in der die KI Informationen für dich aufbereitet.",
      submit: "Aktualisieren",
      saveError: "Die KI-Sprache konnte nicht gespeichert werden. Bitte versuche es erneut.",
    },
    languageName: {
      de: "Deutsch",
      en: "Englisch",
    },
    toast: {
      added: "KI-Zugang hinzugefügt",
      updated: "KI-Zugang aktualisiert",
      deleted: "KI-Zugang gelöscht",
      languageUpdated: "KI-Sprache aktualisiert",
    },
  },
  loadError: {
    retry: "Erneut versuchen",
  },
  error: {
    title: "Etwas ist schiefgelaufen",
    description:
      "Ein unerwarteter Fehler ist aufgetreten. Lade die Seite neu oder versuche es später erneut.",
    reload: "Seite neu laden",
  },
  notFound: {
    title: "Seite nicht gefunden",
    description: "Die gesuchte Seite existiert nicht mehr oder wurde verschoben.",
    openHomePage: "Startseite öffnen",
  },
};
