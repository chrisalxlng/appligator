import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DetailPage } from "../collection/DetailPage.tsx";
import { MailMessageDetail } from "../mail/MailMessageDetail.tsx";
import { useMailMessage } from "../mail/mailQueries.ts";

export function EmailDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { messageId } = useParams({ from: "/shell/emails/$messageId" });

  return (
    <DetailPage
      title={t("navigation.emails")}
      texts={{
        loading: t("emails.loadingMessage"),
        notFound: t("emails.notFound", { returnObjects: true }),
        loadError: t("emails.detailLoadError", { returnObjects: true }),
      }}
      query={useMailMessage(messageId)}
      onClose={() => void navigate({ to: "/emails" })}
      backLink={<Link to="/emails" />}
    >
      {(message) => <MailMessageDetail message={message} />}
    </DetailPage>
  );
}
