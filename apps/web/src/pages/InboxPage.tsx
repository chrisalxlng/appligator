import type { MailMessageListItem } from "@appligator/shared";
import { Badge, Button, EmptyState, LinkButton, useSuccessToast } from "@appligator/ui";
import { IconRefresh } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/apiClient.ts";
import emptyIllustration from "../assets/jobs-empty.svg";
import collectionStyles from "../collection/CollectionPage.module.css";
import { useCreatedLabel } from "../collection/useCreatedLabel.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { PageSpinner } from "../loading/PageSpinner.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import { MailMessageDrawer } from "../mail/MailMessageDrawer.tsx";
import { useMailAccount, useMailMessages, useSyncMail } from "../mail/mailQueries.ts";
import { DocumentTitle } from "../shell/DocumentTitle.tsx";
import { FloatingActions } from "../shell/FloatingActions.tsx";
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import a11y from "../styles/visuallyHidden.module.css";
import styles from "./InboxPage.module.css";
import { Page } from "./Page.tsx";

const illustration = <img src={emptyIllustration} alt="" width={210} height={281} />;

export function InboxPage() {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const account = useMailAccount();
  const messages = useMailMessages();
  const sync = useSyncMail();
  const showSuccess = useSuccessToast();
  const isPending = account.isPending || messages.isPending;
  const showSpinner = useDelayedSpinner(isPending);
  const [opened, setOpened] = useState<{ message: MailMessageListItem | null; open: boolean }>({
    message: null,
    open: false,
  });

  const title = t("navigation.inbox");
  const documentTitle = <DocumentTitle title={title} />;

  if (isPending || showSpinner) {
    return (
      <Page title={title}>
        {documentTitle}
        {showSpinner && <PageSpinner label={t("inbox.loading")} />}
      </Page>
    );
  }

  if (account.isError || messages.isError) {
    return (
      <Page title={title} hideHeader={isDesktop}>
        {documentTitle}
        <LoadError
          title={t("inbox.loadError.title")}
          description={t("inbox.loadError.description")}
          onRetry={() => {
            void account.refetch();
            void messages.refetch();
          }}
        />
      </Page>
    );
  }

  const { items, total } = messages.data;

  if (!account.data && items.length === 0) {
    return (
      <Page title={title} hideHeader={isDesktop} className={collectionStyles.empty}>
        {documentTitle}
        <EmptyState
          illustration={illustration}
          title={t("inbox.noAccount.title")}
          description={t("inbox.noAccount.description")}
          action={
            <LinkButton render={<Link to="/profile" />}>{t("inbox.noAccount.action")}</LinkButton>
          }
        />
      </Page>
    );
  }

  function retrieve() {
    sync.mutate(undefined, {
      onSuccess: ({ newMails }) => {
        if (newMails === 0) showSuccess(t("inbox.toast.noNewMails"));
      },
    });
  }

  const syncButton = account.data && (
    <Button pending={sync.isPending} onClick={retrieve}>
      <IconRefresh size={20} stroke={2.4} aria-hidden />
      {t("inbox.sync.action")}
    </Button>
  );
  const floatingSyncButton = !isDesktop && syncButton && (
    <FloatingActions>{syncButton}</FloatingActions>
  );
  // The account shows why the mailbox couldn't be read, so only other failures need a message here.
  const syncFailed = sync.isError && !(sync.error instanceof ApiError && sync.error.status === 422);
  const notices = (
    <>
      {account.data?.syncError && (
        <p role="alert" className={styles.syncError}>
          {t(`inbox.syncError.${account.data.syncError}`)}{" "}
          <Link to="/profile" className={styles.syncErrorLink}>
            {t("inbox.syncError.action")}
          </Link>
        </p>
      )}
      {syncFailed && (
        <p role="alert" className={styles.syncError}>
          {t("inbox.sync.error")}
        </p>
      )}
    </>
  );

  if (items.length === 0) {
    return (
      <Page title={title} hideHeader={isDesktop} className={collectionStyles.empty}>
        {documentTitle}
        <div className={styles.centeredNotices}>{notices}</div>
        <EmptyState
          illustration={illustration}
          title={t("inbox.empty.title")}
          description={t("inbox.empty.description")}
          action={isDesktop && syncButton}
        />
        {floatingSyncButton}
      </Page>
    );
  }

  return (
    <Page title={title} actions={isDesktop && syncButton}>
      {documentTitle}
      <div className={styles.inbox}>
        <p className={styles.description}>{t("inbox.description")}</p>
        {notices}
        <ul className={styles.list}>
          {items.map((message) => (
            <li key={message.id}>
              <MailMessageRow message={message} onOpen={() => setOpened({ message, open: true })} />
            </li>
          ))}
        </ul>
        {total > items.length && (
          <p className={styles.description}>{t("inbox.limited", { shown: items.length, total })}</p>
        )}
      </div>
      {floatingSyncButton}
      <MailMessageDrawer
        message={opened.message}
        open={opened.open}
        onOpenChange={(open) => setOpened((current) => ({ ...current, open }))}
      />
    </Page>
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
