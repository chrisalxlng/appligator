import { useTranslation } from "react-i18next";
import { DocumentTitle } from "../shell/DocumentTitle.tsx";
import { Page } from "./Page.tsx";

export function ApplicationsPage() {
  const { t } = useTranslation();

  const title = t("navigation.applications");

  return (
    <Page title={title}>
      <DocumentTitle title={title} />
    </Page>
  );
}
