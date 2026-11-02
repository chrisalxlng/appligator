import { Button, LinkButton, useInfoToast } from "@appligator/ui";
import { IconMail, IconRefresh } from "@tabler/icons-react";
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
import { useMailDateLabel } from "../mail/useMailDateLabel.ts";
import { useMailMessageStatus } from "../mail/useMailMessageStatus.ts";
import styles from "./EmailsPage.module.css";

export function EmailsPage() {
  const { t } = useTranslation();
  const { messageId } = useParams({ strict: false });
  const account = useMailAccount();
  const statusCounts = useMailMessageStatusCounts();
  const [status, setStatus] = useStatusFilter(statusCounts.data);
  const messages = useMailMessages(status);
  const messageStatus = useMailMessageStatus();
  const mailDateLabel = useMailDateLabel();
  const sync = useSyncMail();
  const showInfo = useInfoToast();

  function retrieve() {
    sync.mutate(undefined, {
      onSuccess: ({ newMails }) => {
        if (newMails === 0) showInfo(t("emails.toast.noNewMails"), IconMail);
      },
    });
  }

  // The account tells why the mailbox couldn't be read, so only other failures need their own text.
  const syncFailed = sync.isError && !(sync.error instanceof ApiError && sync.error.status === 422);
  const syncError = account.data?.syncError
    ? t(`emails.syncError.${account.data.syncError}`)
    : syncFailed && t("emails.syncError.failed");

  function emptyTexts() {
    if (account.isSuccess && !account.data) return t("emails.noAccount", { returnObjects: true });
    if (syncError) return { title: t("emails.syncError.title"), description: syncError };
    return t("emails.empty", { returnObjects: true });
  }

  return (
    <CollectionPage
      title={t("navigation.emails")}
      texts={{
        loading: t("emails.loading"),
        loadingMore: t("emails.loadingMore"),
        loadError: t("emails.loadError", { returnObjects: true }),
        loadMoreError: t("emails.loadMoreError", { returnObjects: true }),
        empty: emptyTexts(),
      }}
      query={messages}
      openedId={messageId}
      action={
        account.data ? (
          <Button pending={sync.isPending} onClick={retrieve}>
            <IconRefresh size={20} stroke={2.4} aria-hidden />
            {t("emails.sync")}
          </Button>
        ) : (
          account.isSuccess && (
            <LinkButton render={<Link to="/profile" />}>{t("emails.noAccount.action")}</LinkButton>
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
            position: message.subject || t("emails.noSubject"),
            company: message.folder === "sent" ? message.to : message.from,
            pinned: false,
            createdAt: message.sentAt ?? message.createdAt,
          }))}
          dateLabel={mailDateLabel}
          openedId={messageId}
          status={(message) =>
            message.status === "pending" && message.hasSuggestion
              ? { label: t("emails.suggestion.label"), tone: "highlight" }
              : messageStatus(message.status)
          }
          renderLink={(message, props) => (
            <Link to="/emails/$messageId" params={{ messageId: message.id }} {...props} />
          )}
          pinnedCollapsed={false}
          onPinnedCollapsedChange={() => {}}
          onEndReached={onEndReached}
        />
      )}
    />
  );
}
