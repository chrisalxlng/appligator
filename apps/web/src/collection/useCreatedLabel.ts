import { useTranslation } from "react-i18next";
import { daysAgo, formatDate } from "../details/format.ts";

export function useRecentDayLabel() {
  const { t } = useTranslation();

  return (isoDateTime: string) => {
    const days = daysAgo(isoDateTime);
    if (days === 0) return t("common.today");
    if (days === 1) return t("common.yesterday");
    return undefined;
  };
}

export function useCreatedLabel() {
  const { i18n } = useTranslation();
  const recentDayLabel = useRecentDayLabel();

  return (createdAt: string) => recentDayLabel(createdAt) ?? formatDate(createdAt, i18n.language);
}
