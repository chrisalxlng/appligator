import type { MailMessageStatus } from "@appligator/shared";
import type { BadgeTone } from "@appligator/ui";
import { useTranslation } from "react-i18next";

const tones: Record<MailMessageStatus, BadgeTone> = {
  pending: "info",
  autoAssigned: "highlight",
  assigned: "success",
  dismissed: "neutral",
};

export function useMailMessageStatus() {
  const { t } = useTranslation();
  return (status: MailMessageStatus) => ({
    label: t(`emails.status.${status}`),
    tone: tones[status],
  });
}
