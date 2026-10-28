import { aiModelCatalogSchema, aiSettingsSchema, type AiSettingsInput } from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";

const optionalSettingsSchema = aiSettingsSchema.nullable();

export function createAiApi(api: ApiClient) {
  return {
    getModels: () => api.request("/ai/models", aiModelCatalogSchema),
    getSettings: () => api.request("/ai/settings", optionalSettingsSchema),
    saveSettings: (input: AiSettingsInput) =>
      api.request("/ai/settings", aiSettingsSchema, { method: "PUT", body: input }),
    deleteSettings: () => api.requestWithoutContent("/ai/settings", { method: "DELETE" }),
  };
}
