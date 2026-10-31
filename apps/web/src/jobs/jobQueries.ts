import type { Job, JobInput, JobListPage, JobStatus } from "@appligator/shared";
import {
  keepPreviousData,
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { useApiClient } from "../api/useApiClient.ts";
import { createJobsApi } from "./jobsApi.ts";

const searchLimit = 20;

export const jobKeys = {
  list: (status: JobStatus | null) => ["jobs", "list", status] as const,
  search: (search: string) => ["jobs", "search", search] as const,
  statusCounts: ["jobs", "status-counts"] as const,
  detail: (id: string) => ["jobs", "detail", id] as const,
};

export function invalidateJobCollections(queryClient: QueryClient) {
  return Promise.all(
    [["jobs", "list"], ["jobs", "search"], jobKeys.statusCounts].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

function useJobsApi() {
  return createJobsApi(useApiClient());
}

export function useJobs(status: JobStatus | null = null) {
  const jobsApi = useJobsApi();
  return useInfiniteQuery({
    queryKey: jobKeys.list(status),
    queryFn: ({ pageParam }) => jobsApi.list({ cursor: pageParam, status }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}

export function useOpenJobSearch(search: string) {
  const jobsApi = useJobsApi();
  return useQuery({
    queryKey: jobKeys.search(search),
    queryFn: () => jobsApi.list({ status: "open", search, limit: searchLimit }),
    select: (page) => page.items,
    placeholderData: keepPreviousData,
  });
}

export function useJobStatusCounts() {
  const jobsApi = useJobsApi();
  return useQuery({ queryKey: jobKeys.statusCounts, queryFn: jobsApi.statusCounts });
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
      return invalidateJobCollections(queryClient);
    },
  });
}

export function useDeleteJob(id: string) {
  const jobsApi = useJobsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => jobsApi.remove(id),
    onSuccess: () => invalidateJobCollections(queryClient),
  });
}

export function usePinJob(id: string) {
  const jobsApi = useJobsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pinned: boolean) => jobsApi.pin(id, pinned),
    onSuccess: (_, pinned) => {
      queryClient.setQueryData<Job>(jobKeys.detail(id), (job) => job && { ...job, pinned });
      return invalidateJobCollections(queryClient);
    },
  });
}

function markViewedInCache(queryClient: QueryClient, id: string) {
  queryClient.setQueryData<Job>(jobKeys.detail(id), (job) => job && { ...job, isNew: false });
  queryClient.setQueriesData<InfiniteData<JobListPage>>(
    { queryKey: ["jobs", "list"] },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => (item.id === id ? { ...item, isNew: false } : item)),
        })),
      },
  );
}

export function useMarkJobViewed({ id, isNew }: Job) {
  const jobsApi = useJobsApi();
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: () => jobsApi.markViewed(id),
    onSuccess: () => markViewedInCache(queryClient, id),
  });

  useEffect(() => {
    if (isNew) mutate();
  }, [isNew, mutate]);
}
