import {
  applicationCountsSchema,
  applicationListPageSchema,
  applicationSchema,
  type ApplicationCreate,
  type ApplicationInput,
  type ApplicationStatus,
} from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";
import { listPath } from "../api/listPath.ts";

interface ApplicationListParams {
  cursor: string | null;
  status?: ApplicationStatus | null;
  favorite?: boolean;
}

export function createApplicationsApi(api: ApiClient) {
  return {
    list: (params: ApplicationListParams) =>
      api.request(listPath("/applications", { ...params }), applicationListPageSchema),
    counts: () => api.request("/applications/counts", applicationCountsSchema),
    get: (id: string) => api.request(`/applications/${id}`, applicationSchema),
    create: (input: ApplicationCreate) =>
      api.request("/applications", applicationSchema, { method: "POST", body: input }),
    update: (id: string, input: ApplicationInput) =>
      api.request(`/applications/${id}`, applicationSchema, { method: "PUT", body: input }),
    markFavorite: (id: string, favorite: boolean) =>
      api.requestWithoutContent(`/applications/${id}/favorite`, {
        method: "PUT",
        body: { favorite },
      }),
    remove: (id: string) => api.requestWithoutContent(`/applications/${id}`, { method: "DELETE" }),
  };
}
