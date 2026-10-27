import { useTranslation } from "react-i18next";
import { Page } from "./Page.tsx";

export function HomePage() {
  const { t } = useTranslation();

  return <Page title={t("navigation.home")} />;
}
