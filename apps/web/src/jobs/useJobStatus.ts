import type { JobStatus } from "@appligator/shared";
import type { BadgeTone } from "@appligator/ui";
import { useTranslation } from "react-i18next";

const tones: Record<JobStatus, BadgeTone> = { open: "neutral", applied: "success" };

export function useJobStatus() {
  const { t } = useTranslation();
  return (status: JobStatus) => ({ label: t(`jobs.status.${status}`), tone: tones[status] });
}
