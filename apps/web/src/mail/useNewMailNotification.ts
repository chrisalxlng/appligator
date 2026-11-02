import { useSuccessToast } from "@appligator/ui";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMailMessageCount, useRefreshMailAfterNewMessages } from "./mailQueries.ts";

export function useNewMailNotification() {
  const { t } = useTranslation();
  const { data: count } = useMailMessageCount();
  const refresh = useRefreshMailAfterNewMessages();
  const showSuccess = useSuccessToast();
  const previousCount = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (count === undefined) return;

    const previous = previousCount.current;
    previousCount.current = count;
    if (previous === undefined || count <= previous) return;

    void refresh();
    showSuccess(t("inbox.toast.newMails", { count: count - previous }));
  }, [count, refresh, showSuccess, t]);
}
