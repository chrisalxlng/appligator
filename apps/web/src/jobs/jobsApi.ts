import { jobListItemSchema, jobSchema, type JobInput } from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";

const jobListSchema = { parse: (data: unknown) => jobListItemSchema.array().parse(data) };

export function createJobsApi(api: ApiClient) {
  return {
    list: () => api.request("/jobs", jobListSchema),
    get: (id: string) => api.request(`/jobs/${id}`, jobSchema),
    create: (input: JobInput) => api.request("/jobs", jobSchema, { method: "POST", body: input }),
    update: (id: string, input: JobInput) =>
      api.request(`/jobs/${id}`, jobSchema, { method: "PUT", body: input }),
    remove: (id: string) => api.requestWithoutContent(`/jobs/${id}`, { method: "DELETE" }),
  };
}
