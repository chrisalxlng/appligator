import type { ActivityInput } from "@appligator/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api/useApiClient.ts";
import {
  applicationKeys,
  invalidateApplicationStatus,
} from "../applications/applicationQueries.ts";
import { createActivitiesApi } from "./activitiesApi.ts";

const activityKeys = {
  list: (applicationId: string) =>
    [...applicationKeys.detail(applicationId), "activities"] as const,
};

function useActivitiesApi() {
  return createActivitiesApi(useApiClient());
}

export function useActivities(applicationId: string) {
  const activitiesApi = useActivitiesApi();
  return useQuery({
    queryKey: activityKeys.list(applicationId),
    queryFn: () => activitiesApi.list(applicationId),
  });
}

function useActivityMutation<Variables, Result>(
  applicationId: string,
  mutationFn: (variables: Variables) => Promise<Result>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) }),
        invalidateApplicationStatus(queryClient),
      ]),
  });
}

export function useAddActivity(applicationId: string) {
  const activitiesApi = useActivitiesApi();
  return useActivityMutation(applicationId, (input: ActivityInput) =>
    activitiesApi.create(applicationId, input),
  );
}

export function useSaveActivity(applicationId: string, id: string) {
  const activitiesApi = useActivitiesApi();
  return useActivityMutation(applicationId, (input: ActivityInput) =>
    activitiesApi.update(applicationId, id, input),
  );
}

export function useReviewDetails(applicationId: string) {
  const activitiesApi = useActivitiesApi();
  return useActivityMutation(applicationId, (ids: string[]) =>
    Promise.all(ids.map((id) => activitiesApi.reviewDetails(applicationId, id))),
  );
}

export function useDeleteActivity(applicationId: string, id: string) {
  const activitiesApi = useActivitiesApi();
  return useActivityMutation(applicationId, () => activitiesApi.remove(applicationId, id));
}
