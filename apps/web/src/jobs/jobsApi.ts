import { jobListPageSchema, jobSchema, type JobInput } from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";

export function createJobsApi(api: ApiClient) {
  return {
    list: (cursor: string | null) =>
      api.request(cursor ? `/jobs?cursor=${cursor}` : "/jobs", jobListPageSchema),
    get: (id: string) => api.request(`/jobs/${id}`, jobSchema),
    create: (input: JobInput) => api.request("/jobs", jobSchema, { method: "POST", body: input }),
    update: (id: string, input: JobInput) =>
      api.request(`/jobs/${id}`, jobSchema, { method: "PUT", body: input }),
    remove: (id: string) => api.requestWithoutContent(`/jobs/${id}`, { method: "DELETE" }),
  };
}
