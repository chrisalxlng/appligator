import {
  applicationListPageSchema,
  applicationSchema,
  applicationStatusCountsSchema,
  type ApplicationCreate,
  type ApplicationInput,
  type ApplicationStatus,
} from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";
import { listPath } from "../api/listPath.ts";

export function createApplicationsApi(api: ApiClient) {
  return {
    list: (cursor: string | null, status: ApplicationStatus | null) =>
      api.request(listPath("/applications", { cursor, status }), applicationListPageSchema),
    statusCounts: () => api.request("/applications/status-counts", applicationStatusCountsSchema),
    get: (id: string) => api.request(`/applications/${id}`, applicationSchema),
    create: (input: ApplicationCreate) =>
      api.request("/applications", applicationSchema, { method: "POST", body: input }),
    update: (id: string, input: ApplicationInput) =>
      api.request(`/applications/${id}`, applicationSchema, { method: "PUT", body: input }),
    remove: (id: string) => api.requestWithoutContent(`/applications/${id}`, { method: "DELETE" }),
  };
}
