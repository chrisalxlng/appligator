import type { Job, JobInput } from "@appligator/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createApiClient } from "../api/apiClient.ts";
import { useAuth } from "../auth/useAuth.ts";
import { createJobsApi } from "./jobsApi.ts";

const jobKeys = {
  all: ["jobs"] as const,
  detail: (id: string) => ["jobs", id] as const,
};

function useJobsApi() {
  const { getToken } = useAuth();
  return useMemo(() => createJobsApi(createApiClient(getToken)), [getToken]);
}

export function useJobs() {
  const jobsApi = useJobsApi();
  return useQuery({ queryKey: jobKeys.all, queryFn: jobsApi.list });
}

export function useJob(id: string) {
  const jobsApi = useJobsApi();
  return useQuery({ queryKey: jobKeys.detail(id), queryFn: () => jobsApi.get(id) });
}

export function useSaveJob(id?: string) {
  const jobsApi = useJobsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: JobInput) => (id ? jobsApi.update(id, input) : jobsApi.create(input)),
    onSuccess: (job: Job) => {
      queryClient.setQueryData(jobKeys.detail(job.id), job);
      return queryClient.invalidateQueries({ queryKey: jobKeys.all, exact: true });
    },
  });
}

export function useDeleteJob(id: string) {
  const jobsApi = useJobsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => jobsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobKeys.all, exact: true }),
  });
}
