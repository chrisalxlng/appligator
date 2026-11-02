import { Button, LinkButton, useSuccessToast } from "@appligator/ui";
import { IconRefresh } from "@tabler/icons-react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/apiClient.ts";
import { CardList } from "../collection/CardList.tsx";
import { CollectionPage } from "../collection/CollectionPage.tsx";
import { StatusFilter } from "../collection/StatusFilter.tsx";
import { useStatusFilter } from "../collection/useStatusFilter.ts";
import {
  useMailAccount,
  useMailMessages,
  useMailMessageStatusCounts,
  useSyncMail,
} from "../mail/mailQueries.ts";
import { useMailMessageStatus } from "../mail/useMailMessageStatus.ts";
import styles from "./InboxPage.module.css";

export function InboxPage() {
  const { t } = useTranslation();
  const { messageId } = useParams({ strict: false });
  const account = useMailAccount();
  const statusCounts = useMailMessageStatusCounts();
  const [status, setStatus] = useStatusFilter(statusCounts.data);
  const messages = useMailMessages(status);
  const messageStatus = useMailMessageStatus();
  const sync = useSyncMail();
  const showSuccess = useSuccessToast();

  function retrieve() {
    sync.mutate(undefined, {
      onSuccess: ({ newMails }) => {
        if (newMails === 0) showSuccess(t("inbox.toast.noNewMails"));
      },
    });
  }

  // The account tells why the mailbox couldn't be read, so only other failures need their own text.
  const syncFailed = sync.isError && !(sync.error instanceof ApiError && sync.error.status === 422);
  const syncError = account.data?.syncError
    ? t(`inbox.syncError.${account.data.syncError}`)
    : syncFailed && t("inbox.syncError.failed");

  function emptyTexts() {
    if (account.isSuccess && !account.data) return t("inbox.noAccount", { returnObjects: true });
    if (syncError) return { title: t("inbox.syncError.title"), description: syncError };
    return t("inbox.empty", { returnObjects: true });
  }

  return (
    <CollectionPage
      title={t("navigation.inbox")}
      texts={{
        loading: t("inbox.loading"),
        loadingMore: t("inbox.loadingMore"),
        loadError: t("inbox.loadError", { returnObjects: true }),
        loadMoreError: t("inbox.loadMoreError", { returnObjects: true }),
        empty: emptyTexts(),
      }}
      query={messages}
      openedId={messageId}
      action={
        account.data ? (
          <Button pending={sync.isPending} onClick={retrieve}>
            <IconRefresh size={20} stroke={2.4} aria-hidden />
            {t("inbox.sync")}
          </Button>
        ) : (
          account.isSuccess && (
            <LinkButton render={<Link to="/profile" />}>{t("inbox.noAccount.action")}</LinkButton>
          )
        )
      }
      filter={
        <>
          {syncError && (
            <p role="alert" className={styles.syncError}>
              {syncError}
            </p>
          )}
          <StatusFilter
            counts={statusCounts.data ?? []}
            selected={status}
            onSelect={setStatus}
            statusLabel={(status) => messageStatus(status).label}
          />
        </>
      }
      renderList={(items, onEndReached) => (
        <CardList
          items={items.map((message) => ({
            ...message,
            position: message.subject || t("inbox.noSubject"),
            company: message.folder === "sent" ? message.to : message.from,
            pinned: false,
          }))}
          openedId={messageId}
          status={(message) => messageStatus(message.status)}
          renderLink={(message, props) => (
            <Link to="/inbox/$messageId" params={{ messageId: message.id }} {...props} />
          )}
          pinnedCollapsed={false}
          onPinnedCollapsedChange={() => {}}
          onEndReached={onEndReached}
        />
      )}
    />
  );
}
