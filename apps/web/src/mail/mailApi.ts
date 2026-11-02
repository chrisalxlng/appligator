import { mailAccountSchema, type MailAccountInput } from "@appligator/shared";
import type { ApiClient } from "../api/apiClient.ts";

const optionalAccountSchema = mailAccountSchema.nullable();

export function createMailApi(api: ApiClient) {
  return {
    getAccount: () => api.request("/mail/account", optionalAccountSchema),
    saveAccount: (input: MailAccountInput) =>
      api.request("/mail/account", mailAccountSchema, { method: "PUT", body: input }),
    deleteAccount: () => api.requestWithoutContent("/mail/account", { method: "DELETE" }),
  };
}
