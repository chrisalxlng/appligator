import type { Attachment } from "@appligator/shared";
import { Drawer, RichText } from "@appligator/ui";
import { IconCalendarEvent, IconUser, IconUsers } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Property, PropertyList } from "../collection/DetailView.tsx";
import a11y from "../collection/visuallyHidden.module.css";
import { formatDateTime } from "../details/format.ts";
import styles from "./AttachmentCards.module.css";
import { useDescribeAttachment } from "./useDescribeAttachment.ts";
import { useOpenFile } from "./useOpenFile.ts";

type EmailAttachment = Extract<Attachment, { kind: "email" }>;

export function AttachmentCards({ attachments }: { attachments: Attachment[] }) {
  const { t } = useTranslation();
  const describe = useDescribeAttachment();
  const openFile = useOpenFile();
  const [openedEmail, setOpenedEmail] = useState<{ email: EmailAttachment | null; open: boolean }>({
    email: null,
    open: false,
  });

  function card(attachment: Attachment) {
    const { icon: AttachmentIcon, title, meta } = describe(attachment);
    const hint = attachment.kind === "link" ? t("common.opensInNewTab") : t("common.openHint");
    const content: ReactNode = (
      <>
        <AttachmentIcon size={20} stroke={2} aria-hidden />
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          <span className={styles.meta}>{meta}</span>
        </span>
        <span className={a11y.visuallyHidden}>{hint}</span>
      </>
    );

    switch (attachment.kind) {
      case "link":
        return (
          <a className={styles.card} href={attachment.url} target="_blank" rel="noreferrer">
            {content}
          </a>
        );
      case "email":
        return (
          <button
            type="button"
            className={styles.card}
            onClick={() => setOpenedEmail({ email: attachment, open: true })}
          >
            {content}
          </button>
        );
      case "file":
        return (
          <button type="button" className={styles.card} onClick={() => openFile.open(attachment)}>
            {content}
          </button>
        );
    }
  }

  return (
    <>
      <ul className={styles.cards}>
        {attachments.map((attachment, index) => (
          <li key={index}>{card(attachment)}</li>
        ))}
      </ul>
      {openFile.isError && (
        <p role="alert" className={styles.error}>
          {t("attachments.errors.openFailed")}
        </p>
      )}
      <Drawer
        title={
          openedEmail.email ? openedEmail.email.subject || t("attachments.email.noSubject") : ""
        }
        closeLabel={t("common.close")}
        open={openedEmail.open}
        onOpenChange={(open) => setOpenedEmail((current) => ({ ...current, open }))}
      >
        {openedEmail.email && <Email email={openedEmail.email} />}
      </Drawer>
    </>
  );
}

function Email({ email }: { email: EmailAttachment }) {
  const { t, i18n } = useTranslation();

  return (
    <div className={styles.email}>
      {(email.from || email.to || email.sentAt) && (
        <PropertyList>
          {email.from && (
            <Property icon={IconUser} label={t("attachments.email.from")}>
              {email.from}
            </Property>
          )}
          {email.to && (
            <Property icon={IconUsers} label={t("attachments.email.to")}>
              {email.to}
            </Property>
          )}
          {email.sentAt && (
            <Property icon={IconCalendarEvent} label={t("attachments.email.sentAt")}>
              {formatDateTime(email.sentAt, i18n.language)}
            </Property>
          )}
        </PropertyList>
      )}
      <RichText html={email.body} headingLevel={3} />
    </div>
  );
}
