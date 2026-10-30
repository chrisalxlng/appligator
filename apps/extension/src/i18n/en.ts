export const en = {
  login: {
    title: "Log in",
    description:
      "Connect your Chrome extension with Appligator to analyze and submit job ads straight from your browser with one click.",
    submit: "Log in",
  },
  jobImport: {
    title: "Submit job",
    submit: "Submit",
    importing: "The job is imported in the background. You can close this window.",
    done: "Job imported",
    open: "Open in Appligator",
    unsupportedPage: "Jobs cannot be submitted from this page.",
    logout: "Log out",
    errors: {
      notConfigured: "Set up AI access in your Appligator profile first.",
      accessRejected: "The provider rejected your AI access. Check it in your profile.",
      rateLimited:
        "Your key has reached its limit. Check your balance and limits with the provider.",
      providerUnavailable: "The provider is currently unavailable. Please try again later.",
      extractionFailed: "The AI response could not be processed. Please try again.",
      noJobFound: "No job ad was found on this page.",
      pageUnreadable: "The page could not be read. Reload it and try again.",
      loggedOut: "Your session has expired. Please try again.",
      failed: "Something went wrong. Please try again.",
    },
  },
};

export type Translations = typeof en;
