import { useInfoToast } from "@appligator/ui";
import { IconMail } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  invalidateMailAccount,
  invalidateMailCollections,
  useMailMessageStatusCounts,
} from "./mailQueries.ts";

function totalOf(counts: { count: number }[]) {
  return counts.reduce((sum, { count }) => sum + count, 0);
}

function automaticOf(counts: { status: string; count: number }[]) {
  return counts.find(({ status }) => status === "autoAssigned")?.count ?? 0;
}

export function useNewMailNotification() {
  const { t } = useTranslation();
  const { data: counts } = useMailMessageStatusCounts();
  const queryClient = useQueryClient();
  const showInfo = useInfoToast();
  const previousCounts = useRef(counts);

  useEffect(() => {
    if (!counts) return;

    const previous = previousCounts.current;
    previousCounts.current = counts;
    if (!previous) return;

    const newMails = totalOf(counts) - totalOf(previous);
    const newlyAssigned = automaticOf(counts) - automaticOf(previous);
    if (newMails <= 0 && newlyAssigned <= 0) return;

    void invalidateMailCollections(queryClient);
    void invalidateMailAccount(queryClient);
    if (newlyAssigned > 0) {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      showInfo(t("emails.toast.autoAssigned", { count: newlyAssigned }), IconMail);
    }
    const unassignedMails = newMails - newlyAssigned;
    if (unassignedMails > 0) {
      showInfo(t("emails.toast.newMails", { count: unassignedMails }), IconMail);
    }
  }, [counts, queryClient, showInfo, t]);
}
