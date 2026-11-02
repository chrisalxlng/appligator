import {
  activitySchema,
  mailAccountSchema,
  mailMessageListPageSchema,
  mailMessageSchema,
  mailMessageStatusCountsSchema,
  mailSyncResultSchema,
  type MailAccountInput,
  type MailAssignmentInput,
  type MailMessageStatus,
} from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";
import { listPath } from "../api/listPath.ts";

const optionalAccountSchema = mailAccountSchema.nullable();

export function createMailApi(api: ApiClient) {
  return {
    getAccount: () => api.request("/mail/account", optionalAccountSchema),
    saveAccount: (input: MailAccountInput) =>
      api.request("/mail/account", mailAccountSchema, { method: "PUT", body: input }),
    deleteAccount: () => api.requestWithoutContent("/mail/account", { method: "DELETE" }),
    setAiAssignment: (enabled: boolean) =>
      api.request("/mail/account/ai-assignment", mailAccountSchema, {
        method: "PUT",
        body: { enabled },
      }),
    sync: () => api.request("/mail/sync", mailSyncResultSchema, { method: "POST" }),
    listMessages: (cursor: string | null, status: MailMessageStatus | null) =>
      api.request(listPath("/mail/messages", { cursor, status }), mailMessageListPageSchema),
    messageStatusCounts: () =>
      api.request("/mail/messages/status-counts", mailMessageStatusCountsSchema),
    getMessage: (id: string) => api.request(`/mail/messages/${id}`, mailMessageSchema),
    assignMessage: (id: string, input: MailAssignmentInput) =>
      api.request(`/mail/messages/${id}/assignment`, activitySchema, {
        method: "POST",
        body: input,
      }),
    unassignMessage: (id: string) =>
      api.requestWithoutContent(`/mail/messages/${id}/assignment`, { method: "DELETE" }),
    dismissMessage: (id: string) =>
      api.requestWithoutContent(`/mail/messages/${id}`, { method: "DELETE" }),
  };
}
