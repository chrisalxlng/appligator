import {
  activitySchema,
  mailAccountSchema,
  mailMessageCountSchema,
  mailMessageListSchema,
  mailMessageSchema,
  mailSyncResultSchema,
  type MailAccountInput,
  type MailAssignmentInput,
} from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";

const optionalAccountSchema = mailAccountSchema.nullable();

export function createMailApi(api: ApiClient) {
  return {
    getAccount: () => api.request("/mail/account", optionalAccountSchema),
    saveAccount: (input: MailAccountInput) =>
      api.request("/mail/account", mailAccountSchema, { method: "PUT", body: input }),
    deleteAccount: () => api.requestWithoutContent("/mail/account", { method: "DELETE" }),
    sync: () => api.request("/mail/sync", mailSyncResultSchema, { method: "POST" }),
    listMessages: () => api.request("/mail/messages", mailMessageListSchema),
    countMessages: () => api.request("/mail/messages/count", mailMessageCountSchema),
    getMessage: (id: string) => api.request(`/mail/messages/${id}`, mailMessageSchema),
    assignMessage: (id: string, input: MailAssignmentInput) =>
      api.request(`/mail/messages/${id}/assignment`, activitySchema, {
        method: "POST",
        body: input,
      }),
    dismissMessage: (id: string) =>
      api.requestWithoutContent(`/mail/messages/${id}`, { method: "DELETE" }),
  };
}
