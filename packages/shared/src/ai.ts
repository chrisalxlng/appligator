import { z } from "zod";

export const aiProviders = ["openai", "anthropic", "google", "mistral"] as const;
export const aiLanguages = ["de", "en"] as const;
export const aiErrorCodes = [
  "apiKeyRequired",
  "accessRejected",
  "rateLimited",
  "providerUnavailable",
  "notConfigured",
  "extractionFailed",
] as const;

export const aiSettingsInputSchema = z.object({
  provider: z.enum(aiProviders),
  model: z.string().trim().min(1).max(200),
  apiKey: z.string().trim().min(1).max(1_000).optional(),
  language: z.enum(aiLanguages),
});

export const aiSettingsSchema = aiSettingsInputSchema.omit({ apiKey: true }).extend({
  accessUpdatedAt: z.iso.datetime(),
});

export const aiModelCatalogSchema = z.record(z.enum(aiProviders), z.array(z.string()));

export const aiErrorSchema = z.object({ error: z.enum(aiErrorCodes) });

export type AiProvider = (typeof aiProviders)[number];
export type AiLanguage = (typeof aiLanguages)[number];
export type AiErrorCode = (typeof aiErrorCodes)[number];
export type AiSettingsInput = z.infer<typeof aiSettingsInputSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type AiModelCatalog = z.infer<typeof aiModelCatalogSchema>;
