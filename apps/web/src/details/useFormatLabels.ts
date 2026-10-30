import { useTranslation } from "react-i18next";

export function useFormatLabels() {
  const { t } = useTranslation();
  return {
    bold: t("formatting.bold"),
    italic: t("formatting.italic"),
    heading: t("formatting.heading"),
    bulletList: t("formatting.bulletList"),
    orderedList: t("formatting.orderedList"),
  };
}
