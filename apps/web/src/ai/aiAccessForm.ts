import type { AiLanguage, AiProvider, AiSettings, AiSettingsInput } from "@appligator/shared";

export interface AiAccessFormValues {
  provider: AiProvider | null;
  model: string | null;
  apiKey: string;
}

export type AiAccessFormError =
  | "providerRequired"
  | "modelRequired"
  | "apiKeyRequired"
  | "apiKeyRequiredForProvider";

export type AiAccessFormErrors = Partial<Record<keyof AiAccessFormValues, AiAccessFormError>>;

type ValidationResult =
  | { input: AiSettingsInput; errors?: never }
  | { input?: never; errors: AiAccessFormErrors };

export function toAiAccessFormValues(settings?: AiSettings): AiAccessFormValues {
  return { provider: settings?.provider ?? null, model: settings?.model ?? null, apiKey: "" };
}

function apiKeyError(apiKey: string, provider: AiProvider | null, settings?: AiSettings) {
  if (apiKey) return undefined;
  if (!settings) return "apiKeyRequired";
  if (provider !== settings.provider) return "apiKeyRequiredForProvider";
  return undefined;
}

export function validateAiAccessForm(
  values: AiAccessFormValues,
  { settings, language }: { settings?: AiSettings; language: AiLanguage },
): ValidationResult {
  const { provider, model } = values;
  const apiKey = values.apiKey.trim();
  const errors: AiAccessFormErrors = {};

  if (!provider) errors.provider = "providerRequired";
  if (!model) errors.model = "modelRequired";
  const apiKeyFailure = apiKeyError(apiKey, provider, settings);
  if (apiKeyFailure) errors.apiKey = apiKeyFailure;

  if (!provider || !model || apiKeyFailure) return { errors };

  return {
    input: {
      provider,
      model,
      ...(apiKey && { apiKey }),
      language: settings?.language ?? language,
    },
  };
}
