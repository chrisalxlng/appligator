import type { ApplicationStatus } from "@appligator/shared";
import type { BadgeTone } from "@appligator/ui";
import { useTranslation } from "react-i18next";

const tones: Record<ApplicationStatus, BadgeTone> = { applied: "success" };

export function useApplicationStatus() {
  const { t } = useTranslation();
  return (status: ApplicationStatus) => ({
    label: t(`applications.status.${status}`),
    tone: tones[status],
  });
}
