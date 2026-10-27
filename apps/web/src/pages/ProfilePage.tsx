import { useTranslation } from "react-i18next";
import { Page } from "./Page.tsx";

export function ProfilePage() {
  const { t } = useTranslation();

  return <Page title={t("navigation.profile")} />;
}
