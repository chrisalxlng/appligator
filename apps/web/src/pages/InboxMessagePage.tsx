import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DetailPage } from "../collection/DetailPage.tsx";
import { MailMessageDetail } from "../mail/MailMessageDetail.tsx";
import { useMailMessage } from "../mail/mailQueries.ts";

export function InboxMessagePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { messageId } = useParams({ from: "/shell/inbox/$messageId" });

  return (
    <DetailPage
      title={t("navigation.inbox")}
      texts={{
        loading: t("inbox.loadingMessage"),
        notFound: t("inbox.notFound", { returnObjects: true }),
        loadError: t("inbox.detailLoadError", { returnObjects: true }),
      }}
      query={useMailMessage(messageId)}
      onClose={() => void navigate({ to: "/inbox" })}
      backLink={<Link to="/inbox" />}
    >
      {(message) => <MailMessageDetail message={message} />}
    </DetailPage>
  );
}
