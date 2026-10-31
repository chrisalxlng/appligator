import {
  jobCountsSchema,
  jobListPageSchema,
  jobSchema,
  type JobInput,
  type JobStatus,
} from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";
import { listPath } from "../api/listPath.ts";

interface JobListParams {
  cursor?: string | null;
  status?: JobStatus | null;
  favorite?: boolean;
  search?: string;
  limit?: number;
}

export function createJobsApi(api: ApiClient) {
  return {
    list: (params: JobListParams) =>
      api.request(listPath("/jobs", { ...params }), jobListPageSchema),
    counts: () => api.request("/jobs/counts", jobCountsSchema),
    get: (id: string) => api.request(`/jobs/${id}`, jobSchema),
    create: (input: JobInput) => api.request("/jobs", jobSchema, { method: "POST", body: input }),
    update: (id: string, input: JobInput) =>
      api.request(`/jobs/${id}`, jobSchema, { method: "PUT", body: input }),
    remove: (id: string) => api.requestWithoutContent(`/jobs/${id}`, { method: "DELETE" }),
    markFavorite: (id: string, favorite: boolean) =>
      api.requestWithoutContent(`/jobs/${id}/favorite`, { method: "PUT", body: { favorite } }),
    markViewed: (id: string) => api.requestWithoutContent(`/jobs/${id}/view`, { method: "POST" }),
  };
}
