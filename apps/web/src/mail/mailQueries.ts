import type { ActivityInput, MailAccountInput } from "@appligator/shared";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useApiClient } from "../api/useApiClient.ts";
import {
  applicationKeys,
  invalidateApplicationStatus,
} from "../applications/applicationQueries.ts";
import { createMailApi } from "./mailApi.ts";

const mailAccountKey = ["mail", "account"] as const;
const mailMessageKeys = {
  list: ["mail", "messages", "list"] as const,
  count: ["mail", "messages", "count"] as const,
  detail: (id: string) => ["mail", "messages", "detail", id] as const,
};
// Asking for the number is enough to notice new emails soon, because the mailboxes themselves are
// only read every 10 minutes, and unlike a push channel it works with any number of API instances.
const newMailCheckIntervalMs = 30 * 1000;

// A handled email is gone, so its detail query must not be fetched again.
function invalidateMailMessages(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: mailMessageKeys.list }),
    queryClient.invalidateQueries({ queryKey: mailMessageKeys.count }),
  ]);
}

function useMailApi() {
  return createMailApi(useApiClient());
}

export function useMailAccount() {
  const mailApi = useMailApi();
  return useQuery({ queryKey: mailAccountKey, queryFn: mailApi.getAccount });
}

export function useSaveMailAccount() {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MailAccountInput) => mailApi.saveAccount(input),
    onSuccess: (account) => queryClient.setQueryData(mailAccountKey, account),
  });
}

export function useDeleteMailAccount() {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mailApi.deleteAccount,
    onSuccess: () => {
      queryClient.setQueryData(mailAccountKey, null);
      return invalidateMailMessages(queryClient);
    },
  });
}

export function useSyncMail() {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mailApi.sync,
    onSettled: () =>
      Promise.all([
        invalidateMailMessages(queryClient),
        queryClient.invalidateQueries({ queryKey: mailAccountKey }),
      ]),
  });
}

export function useRefreshMailAfterNewMessages() {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: mailMessageKeys.list }),
        queryClient.invalidateQueries({ queryKey: mailAccountKey }),
      ]),
    [queryClient],
  );
}

export function useMailMessages() {
  const mailApi = useMailApi();
  return useQuery({
    queryKey: mailMessageKeys.list,
    queryFn: mailApi.listMessages,
  });
}

export function useMailMessageCount() {
  const mailApi = useMailApi();
  return useQuery({
    queryKey: mailMessageKeys.count,
    queryFn: mailApi.countMessages,
    select: ({ count }) => count,
    refetchInterval: newMailCheckIntervalMs,
  });
}

export function useMailMessage(id: string) {
  const mailApi = useMailApi();
  return useQuery({
    queryKey: mailMessageKeys.detail(id),
    queryFn: () => mailApi.getMessage(id),
  });
}

export function useAssignMailMessage(id: string, applicationId: string) {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activity: ActivityInput) => mailApi.assignMessage(id, { applicationId, activity }),
    onSuccess: () =>
      Promise.all([
        invalidateMailMessages(queryClient),
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) }),
        invalidateApplicationStatus(queryClient),
      ]),
  });
}

export function useDismissMailMessage(id: string) {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mailApi.dismissMessage(id),
    onSuccess: () => invalidateMailMessages(queryClient),
  });
}
