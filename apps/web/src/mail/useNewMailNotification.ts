import { useSuccessToast } from "@appligator/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  invalidateMailAccount,
  invalidateMailCollections,
  usePendingMailCount,
} from "./mailQueries.ts";

export function useNewMailNotification() {
  const { t } = useTranslation();
  const count = usePendingMailCount();
  const queryClient = useQueryClient();
  const showSuccess = useSuccessToast();
  const previousCount = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (count === undefined) return;

    const previous = previousCount.current;
    previousCount.current = count;
    if (previous === undefined || count <= previous) return;

    void invalidateMailCollections(queryClient);
    void invalidateMailAccount(queryClient);
    showSuccess(t("inbox.toast.newMails", { count: count - previous }));
  }, [count, queryClient, showSuccess, t]);
}
