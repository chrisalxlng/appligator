import type { ActivityInput, MailAccountInput, MailMessageStatus } from "@appligator/shared";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useApiClient } from "../api/useApiClient.ts";
import {
  applicationKeys,
  invalidateApplicationStatus,
} from "../applications/applicationQueries.ts";
import { createMailApi } from "./mailApi.ts";

const mailAccountKey = ["mail", "account"] as const;
const mailMessageKeys = {
  lists: ["mail", "messages", "list"] as const,
  list: (status: MailMessageStatus | null) => ["mail", "messages", "list", status] as const,
  statusCounts: ["mail", "messages", "status-counts"] as const,
  detail: (id: string) => ["mail", "messages", "detail", id] as const,
};
// only read every 10 minutes, and unlike a push channel it works with any number of API instances.
const newMailCheckIntervalMs = 30 * 1000;

export function invalidateMailCollections(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: mailMessageKeys.lists }),
    queryClient.invalidateQueries({ queryKey: mailMessageKeys.statusCounts }),
  ]);
}

export function invalidateMailAccount(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: mailAccountKey });
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
      return invalidateMailCollections(queryClient);
    },
  });
}

export function useSetMailAiAssignment() {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mailApi.setAiAssignment,
    onSuccess: (account) => queryClient.setQueryData(mailAccountKey, account),
  });
}

export function useSyncMail() {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mailApi.sync,
    onSettled: () =>
      Promise.all([invalidateMailCollections(queryClient), invalidateMailAccount(queryClient)]),
  });
}

export function useMailMessages(status: MailMessageStatus | null = null) {
  const mailApi = useMailApi();
  return useInfiniteQuery({
    queryKey: mailMessageKeys.list(status),
    queryFn: ({ pageParam }) => mailApi.listMessages(pageParam, status),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}

export function useMailMessageStatusCounts() {
  const mailApi = useMailApi();
  return useQuery({
    queryKey: mailMessageKeys.statusCounts,
    queryFn: mailApi.messageStatusCounts,
    refetchInterval: newMailCheckIntervalMs,
  });
}

export function usePendingMailCount() {
  const { data: counts } = useMailMessageStatusCounts();
  return counts && (counts.find(({ status }) => status === "pending")?.count ?? 0);
}

export function useMailMessage(id: string) {
  const { t } = useTranslation();
  const mailApi = useMailApi();
  return useQuery({
    queryKey: mailMessageKeys.detail(id),
    queryFn: () => mailApi.getMessage(id),
    select: (message) => ({
      ...message,
      position: message.subject || t("emails.noSubject"),
      company: message.from,
    }),
  });
}

function useMailMessageMutation<Variables>(
  id: string,
  mutationFn: (variables: Variables) => Promise<unknown>,
  onSuccess?: () => Promise<unknown>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        invalidateMailCollections(queryClient),
        queryClient.invalidateQueries({ queryKey: mailMessageKeys.detail(id) }),
        onSuccess?.(),
      ]),
  });
}

export function useAssignMailMessage(id: string, applicationId: string) {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMailMessageMutation(
    id,
    (activity: ActivityInput) => mailApi.assignMessage(id, { applicationId, activity }),
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) }),
        invalidateApplicationStatus(queryClient),
      ]),
  );
}

export function useUnassignMailMessage(id: string) {
  const mailApi = useMailApi();
  const queryClient = useQueryClient();

  return useMailMessageMutation(
    id,
    () => mailApi.unassignMessage(id),
    () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  );
}

export function useDismissMailMessage(id: string) {
  const mailApi = useMailApi();
  return useMailMessageMutation(id, () => mailApi.dismissMessage(id));
}
