import { activityListSchema, activitySchema, type ActivityInput } from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";

export function createActivitiesApi(api: ApiClient) {
  const path = (applicationId: string) => `/applications/${applicationId}/activities`;

  return {
    list: (applicationId: string) => api.request(path(applicationId), activityListSchema),
    create: (applicationId: string, input: ActivityInput) =>
      api.request(path(applicationId), activitySchema, { method: "POST", body: input }),
    update: (applicationId: string, id: string, input: ActivityInput) =>
      api.request(`${path(applicationId)}/${id}`, activitySchema, { method: "PUT", body: input }),
    remove: (applicationId: string, id: string) =>
      api.requestWithoutContent(`${path(applicationId)}/${id}`, { method: "DELETE" }),
  };
}
