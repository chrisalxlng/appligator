import { useTranslation } from "react-i18next";
import { useCreatedLabel } from "../collection/useCreatedLabel.ts";
import { daysAgo, formatTime } from "../details/format.ts";

export function useMailDateLabel() {
  const { i18n } = useTranslation();
  const createdLabel = useCreatedLabel();

  return (isoDateTime: string) =>
    daysAgo(isoDateTime) === 0 ? formatTime(isoDateTime, i18n.language) : createdLabel(isoDateTime);
}
