import { useTranslation } from "react-i18next";
import { MailInbox } from "../mail/MailInbox.tsx";
import { DocumentTitle } from "../shell/DocumentTitle.tsx";
import { Page } from "./Page.tsx";

export function InboxPage() {
  const { t } = useTranslation();
  const title = t("navigation.inbox");

  return (
    <Page title={title}>
      <DocumentTitle title={title} />
      <MailInbox />
    </Page>
  );
}
