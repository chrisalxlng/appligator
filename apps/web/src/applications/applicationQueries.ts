import type { Application, ApplicationInput, ApplicationStatus } from "@appligator/shared";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useApiClient } from "../api/useApiClient.ts";
import { filterParams, type CollectionFilter } from "../collection/useStatusFilter.ts";
import { invalidateJobCollections, jobKeys } from "../jobs/jobQueries.ts";
import { createApplicationsApi } from "./applicationsApi.ts";

const applicationKeys = {
  list: (filter: CollectionFilter<ApplicationStatus>) => ["applications", "list", filter] as const,
  counts: ["applications", "counts"] as const,
  detail: (id: string) => ["applications", "detail", id] as const,
};

function invalidateCollections(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["applications", "list"] }),
    queryClient.invalidateQueries({ queryKey: applicationKeys.counts }),
  ]);
}

function invalidateJob(queryClient: QueryClient, jobId: string) {
  return Promise.all([
    invalidateJobCollections(queryClient),
    queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) }),
  ]);
}

function useApplicationsApi() {
  return createApplicationsApi(useApiClient());
}

export function useApplications(filter: CollectionFilter<ApplicationStatus> = null) {
  const applicationsApi = useApplicationsApi();
  return useInfiniteQuery({
    queryKey: applicationKeys.list(filter),
    queryFn: ({ pageParam }) =>
      applicationsApi.list({ cursor: pageParam, ...filterParams(filter) }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}

export function useApplicationCounts() {
  const applicationsApi = useApplicationsApi();
  return useQuery({ queryKey: applicationKeys.counts, queryFn: applicationsApi.counts });
}

export function useApplication(id: string) {
  const applicationsApi = useApplicationsApi();
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationsApi.get(id),
  });
}

function todayIsoDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export function useApply() {
  const applicationsApi = useApplicationsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => applicationsApi.create({ jobId, appliedAt: todayIsoDate() }),
    onSuccess: (application: Application) => {
      queryClient.setQueryData(applicationKeys.detail(application.id), application);
      return Promise.all([
        invalidateCollections(queryClient),
        invalidateJob(queryClient, application.job.id),
      ]);
    },
  });
}

export function useSaveApplication(id: string) {
  const applicationsApi = useApplicationsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApplicationInput) => applicationsApi.update(id, input),
    onSuccess: (application: Application) => {
      queryClient.setQueryData(applicationKeys.detail(application.id), application);
      return Promise.all([
        invalidateCollections(queryClient),
        queryClient.invalidateQueries({ queryKey: jobKeys.detail(application.job.id) }),
      ]);
    },
  });
}

export function useDeleteApplication(application: Application) {
  const applicationsApi = useApplicationsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => applicationsApi.remove(application.id),
    onSuccess: () =>
      Promise.all([
        invalidateCollections(queryClient),
        invalidateJob(queryClient, application.job.id),
      ]),
  });
}

export function useMarkApplicationFavorite(id: string) {
  const applicationsApi = useApplicationsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (favorite: boolean) => applicationsApi.markFavorite(id, favorite),
    onSuccess: (_, favorite) => {
      queryClient.setQueryData<Application>(
        applicationKeys.detail(id),
        (application) => application && { ...application, favorite },
      );
      return invalidateCollections(queryClient);
    },
  });
}
