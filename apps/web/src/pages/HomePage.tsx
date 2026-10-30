import { useTranslation } from "react-i18next";
import { DocumentTitle } from "../shell/DocumentTitle.tsx";
import { Page } from "./Page.tsx";

export function HomePage() {
  const { t } = useTranslation();

  const title = t("navigation.home");

  return (
    <Page title={title}>
      <DocumentTitle title={title} />
    </Page>
  );
}
