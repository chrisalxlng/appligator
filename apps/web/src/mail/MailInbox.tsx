import type { MailMessageListItem } from "@appligator/shared";
import { Badge, EmptyState, LinkButton, Spinner } from "@appligator/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import emptyIllustration from "../assets/jobs-empty.svg";
import { useCreatedLabel } from "../collection/useCreatedLabel.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import a11y from "../styles/visuallyHidden.module.css";
import { MailMessageDrawer } from "./MailMessageDrawer.tsx";
import styles from "./MailInbox.module.css";
import { useMailAccount, useMailMessages } from "./mailQueries.ts";

export function MailInbox() {
  const { t } = useTranslation();
  const account = useMailAccount();
  const messages = useMailMessages();
  const isPending = account.isPending || messages.isPending;
  const showSpinner = useDelayedSpinner(isPending);
  const [opened, setOpened] = useState<{ message: MailMessageListItem | null; open: boolean }>({
    message: null,
    open: false,
  });

  if (isPending) return showSpinner ? <Spinner label={t("inbox.loading")} /> : null;

  if (account.isError || messages.isError) {
    return (
      <LoadError
        title={t("inbox.loadError.title")}
        description={t("inbox.loadError.description")}
        onRetry={() => {
          void account.refetch();
          void messages.refetch();
        }}
      />
    );
  }

  const { items, total } = messages.data;

  if (!account.data && items.length === 0) {
    return (
      <EmptyState
        illustration={<img src={emptyIllustration} alt="" width={210} height={281} />}
        title={t("inbox.noAccount.title")}
        description={t("inbox.noAccount.description")}
        action={
          <LinkButton render={<Link to="/profile" />}>{t("inbox.noAccount.action")}</LinkButton>
        }
      />
    );
  }

  return (
    <div className={styles.inbox}>
      <p className={styles.description}>{t("inbox.description")}</p>
      {account.data?.syncError && (
        <p role="alert" className={styles.syncError}>
          {t(`inbox.syncError.${account.data.syncError}`)}{" "}
          <Link to="/profile" className={styles.syncErrorLink}>
            {t("inbox.syncError.action")}
          </Link>
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState
          illustration={<img src={emptyIllustration} alt="" width={210} height={281} />}
          title={t("inbox.empty.title")}
          description={t("inbox.empty.description")}
        />
      ) : (
        <ul className={styles.list}>
          {items.map((message) => (
            <li key={message.id}>
              <MailMessageRow message={message} onOpen={() => setOpened({ message, open: true })} />
            </li>
          ))}
        </ul>
      )}
      {total > items.length && (
        <p className={styles.description}>{t("inbox.limited", { shown: items.length, total })}</p>
      )}
      <MailMessageDrawer
        message={opened.message}
        open={opened.open}
        onOpenChange={(open) => setOpened((current) => ({ ...current, open }))}
      />
    </div>
  );
}

function MailMessageRow({
  message: { subject, from, to, folder, sentAt, receivedAt, attachmentCount },
  onOpen,
}: {
  message: MailMessageListItem;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const dateLabel = useCreatedLabel();

  return (
    <button type="button" className={styles.row} onClick={onOpen}>
      <span className={styles.subject}>{subject || t("inbox.noSubject")}</span>
      <span className={styles.meta}>
        {folder === "sent" ? to : from} • {dateLabel(sentAt ?? receivedAt)}
      </span>
      {(folder === "sent" || attachmentCount > 0) && (
        <span className={styles.badges}>
          {folder === "sent" && <Badge>{t("inbox.sent")}</Badge>}
          {attachmentCount > 0 && (
            <Badge tone="info">{t("inbox.filesNotImported", { count: attachmentCount })}</Badge>
          )}
        </span>
      )}
      <span className={a11y.visuallyHidden}>{t("common.openHint")}</span>
    </button>
  );
}
