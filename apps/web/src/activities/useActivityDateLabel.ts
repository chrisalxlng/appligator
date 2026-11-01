import { useTranslation } from "react-i18next";
import { useRecentDayLabel } from "../collection/useCreatedLabel.ts";
import { daysAgo } from "../details/format.ts";

const daysPerWeek = 7;

export function useActivityDateLabel() {
  const { i18n } = useTranslation();
  const recentDayLabel = useRecentDayLabel();

  return (occurredAt: string) => {
    const recentDay = recentDayLabel(occurredAt);
    if (recentDay) return recentDay;

    const days = daysAgo(occurredAt);
    const date = new Date(occurredAt);
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
