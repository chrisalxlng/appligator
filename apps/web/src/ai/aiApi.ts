import {
  aiModelCatalogSchema,
  aiSettingsSchema,
  jobExtractionSchema,
  type AiSettingsInput,
} from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";

const optionalSettingsSchema = aiSettingsSchema.nullable();

export function createAiApi(api: ApiClient) {
  return {
    getModels: () => api.request("/ai/models", aiModelCatalogSchema),
    getSettings: () => api.request("/ai/settings", optionalSettingsSchema),
    saveSettings: (input: AiSettingsInput) =>
      api.request("/ai/settings", aiSettingsSchema, { method: "PUT", body: input }),
    deleteSettings: () => api.requestWithoutContent("/ai/settings", { method: "DELETE" }),
    verifySettings: () =>
      api.requestWithoutContent("/ai/settings/verification", { method: "POST" }),
    extractJob: (description: string, signal: AbortSignal) =>
      api.request("/ai/job-extraction", jobExtractionSchema, {
        method: "POST",
        body: { description },
        signal,
      }),
  };
}
