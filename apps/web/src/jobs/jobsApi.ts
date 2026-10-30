import {
  jobListPageSchema,
  jobSchema,
  jobStatusCountsSchema,
  type JobInput,
  type JobStatus,
} from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";
import { listPath } from "../collection/listPath.ts";

export interface JobListParams {
  cursor?: string | null;
  status?: JobStatus | null;
  search?: string;
  limit?: number;
}

export function createJobsApi(api: ApiClient) {
  return {
    list: (params: JobListParams) =>
      api.request(listPath("/jobs", { ...params }), jobListPageSchema),
    statusCounts: () => api.request("/jobs/status-counts", jobStatusCountsSchema),
    get: (id: string) => api.request(`/jobs/${id}`, jobSchema),
    create: (input: JobInput) => api.request("/jobs", jobSchema, { method: "POST", body: input }),
    update: (id: string, input: JobInput) =>
      api.request(`/jobs/${id}`, jobSchema, { method: "PUT", body: input }),
    remove: (id: string) => api.requestWithoutContent(`/jobs/${id}`, { method: "DELETE" }),
  };
}
