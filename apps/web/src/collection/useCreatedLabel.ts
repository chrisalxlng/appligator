import { useTranslation } from "react-i18next";
import { daysAgo, formatDate } from "../details/format.ts";

export function useCreatedLabel() {
  const { t, i18n } = useTranslation();

  return (createdAt: string) => {
    const days = daysAgo(createdAt);
    if (days === 0) return t("common.today");
    if (days === 1) return t("common.yesterday");
    return formatDate(createdAt, i18n.language);
  };
}
