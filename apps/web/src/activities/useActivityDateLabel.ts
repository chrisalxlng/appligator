import { useTranslation } from "react-i18next";
import { daysAgo } from "../details/format.ts";

const daysPerWeek = 7;

export function useActivityDateLabel() {
  const { t, i18n } = useTranslation();

  return (occurredAt: string) => {
    const days = daysAgo(occurredAt);
    const date = new Date(occurredAt);
    if (days === 0) return t("common.today");
    if (days === 1) return t("common.yesterday");
    if (days > 1 && days < daysPerWeek) {
      return date.toLocaleDateString(i18n.language, { weekday: "long" });
    }
    const isThisYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "short",
      year: isThisYear ? undefined : "numeric",
    });
  };
}
