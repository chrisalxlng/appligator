import type { MailAccountInput } from "@appligator/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api/useApiClient.ts";
import { createMailApi } from "./mailApi.ts";

const mailAccountKey = ["mail", "account"] as const;

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
    onSuccess: () => queryClient.setQueryData(mailAccountKey, null),
  });
}
