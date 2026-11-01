import type {
  ActivityInput,
  Application,
  ApplicationInput,
  ApplicationStatus,
} from "@appligator/shared";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useApiClient } from "../api/useApiClient.ts";
import { createActivitiesApi } from "../activities/activitiesApi.ts";
import { fileIdsOf } from "../attachments/attachments.ts";
import { invalidateJobCollections, jobKeys } from "../jobs/jobQueries.ts";
import { createApplicationsApi } from "./applicationsApi.ts";

export const applicationKeys = {
  list: (status: ApplicationStatus | null) => ["applications", "list", status] as const,
  statusCounts: ["applications", "status-counts"] as const,
  detail: (id: string) => ["applications", "detail", id] as const,
  activities: (id: string) => ["applications", "detail", id, "activities"] as const,
};

function invalidateCollections(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["applications", "list"] }),
    queryClient.invalidateQueries({ queryKey: applicationKeys.statusCounts }),
  ]);
}

export function invalidateApplicationStatus(queryClient: QueryClient) {
  return Promise.all([
    invalidateCollections(queryClient),
    queryClient.invalidateQueries({ queryKey: ["jobs", "detail"] }),
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

export function useApplications(status: ApplicationStatus | null = null) {
  const applicationsApi = useApplicationsApi();
  return useInfiniteQuery({
    queryKey: applicationKeys.list(status),
    queryFn: ({ pageParam }) => applicationsApi.list(pageParam, status),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}

export function useApplicationStatusCounts() {
  const applicationsApi = useApplicationsApi();
  return useQuery({
    queryKey: applicationKeys.statusCounts,
    queryFn: applicationsApi.statusCounts,
  });
}

export function useApplication(id: string) {
  const applicationsApi = useApplicationsApi();
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationsApi.get(id),
  });
}

export function useApply(jobId: string) {
  const applicationsApi = useApplicationsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activity: ActivityInput) => applicationsApi.create({ jobId, activity }),
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
        queryClient.invalidateQueries({ queryKey: applicationKeys.activities(id) }),
        queryClient.invalidateQueries({ queryKey: jobKeys.detail(application.job.id) }),
      ]);
    },
  });
}

export function useDeleteApplication(application: Application) {
  const applicationsApi = useApplicationsApi();
  const activitiesApi = createActivitiesApi(useApiClient());
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const activities = await activitiesApi.list(application.id);
      await applicationsApi.remove(application.id);
      return activities.flatMap(({ attachments }) => fileIdsOf(attachments));
    },
    onSuccess: () =>
      Promise.all([
        invalidateCollections(queryClient),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.detail(application.id),
          refetchType: "none",
        }),
        invalidateJob(queryClient, application.job.id),
      ]),
  });
}

export function usePinApplication(id: string) {
  const applicationsApi = useApplicationsApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pinned: boolean) => applicationsApi.pin(id, pinned),
    onSuccess: (_, pinned) => {
      queryClient.setQueryData<Application>(
        applicationKeys.detail(id),
        (application) => application && { ...application, pinned },
      );
      return invalidateCollections(queryClient);
    },
  });
}
