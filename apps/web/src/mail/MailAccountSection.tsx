import type { MailAccount } from "@appligator/shared";
import { ConfirmDialog, IconButton, Spinner, useSuccessToast } from "@appligator/ui";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import listStyles from "../details/list.module.css";
import { capitalize, formatRelativeTime } from "../i18n/formatRelativeTime.ts";
import { LoadError } from "../loading/LoadError.tsx";
import { useDelayedSpinner } from "../loading/useDelayedSpinner.ts";
import styles from "../profile/settingsSection.module.css";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import a11y from "../styles/visuallyHidden.module.css";
import { MailAccountDrawer } from "./MailAccountDrawer.tsx";
import { useDeleteMailAccount, useMailAccount } from "./mailQueries.ts";

export function MailAccountSection() {
  const { t } = useTranslation();
  const titleId = useId();
  const account = useMailAccount();
  const showSpinner = useDelayedSpinner(account.isPending);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.intro}>
        <h2 id={titleId} className={styles.title}>
          {t("mail.title")}
        </h2>
        <p className={styles.description}>{t("mail.description")}</p>
      </div>
      {showSpinner && <Spinner label={t("mail.loading")} />}
      {account.isError && (
        <LoadError
          title={t("mail.loadError.title")}
          description={t("mail.loadError.description")}
          onRetry={() => void account.refetch()}
          headingLevel={3}
        />
      )}
      {account.isSuccess &&
        (account.data ? (
          <MailAccountCard account={account.data} onEdit={() => setIsDrawerOpen(true)} />
        ) : (
          <button
            type="button"
            className={listStyles.addButton}
            aria-label={t("mail.account.addTitle")}
            onClick={() => setIsDrawerOpen(true)}
          >
            <IconPlus size={20} stroke={2.4} aria-hidden />
            {t("mail.account.add")}
          </button>
        ))}
      <MailAccountDrawer
        account={account.data ?? undefined}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </section>
  );
}

function MailAccountCard({ account, onEdit }: { account: MailAccount; onEdit: () => void }) {
  const { t, i18n } = useTranslation();
  const deleteAccount = useDeleteMailAccount();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();

  function confirmDelete() {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        setIsConfirmingDelete(false);
        showSuccess(t("mail.toast.deleted"));
      },
    });
  }

  return (
    <div className={`${styles.card} ${styles.accessCard}`}>
      <button type="button" className={styles.cardButton} onClick={onEdit}>
        <span className={styles.cardTitle}>{account.username}</span>
        <span className={styles.cardText}>{account.host}</span>
        <span className={styles.cardCaption}>
          {capitalize(
            t("mail.account.updated", {
              time: formatRelativeTime(account.accessUpdatedAt, i18n.language),
            }),
          )}
        </span>
        <span className={a11y.visuallyHidden}>{t("common.editHint")}</span>
      </button>
      <IconButton
        variant="surface"
        className={styles.cardAction}
        label={t("mail.account.delete.action")}
        onClick={() => {
          deleteAccount.reset();
          setIsConfirmingDelete(true);
        }}
      >
        <IconTrash size={20} stroke={2} aria-hidden />
      </IconButton>
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title={t("mail.account.delete.title")}
        description={t("mail.account.delete.description", { username: account.username })}
        confirmLabel={t("mail.account.delete.confirm")}
        cancelLabel={t("mail.account.delete.cancel")}
        onConfirm={confirmDelete}
        pending={deleteAccount.isPending}
        error={deleteAccount.isError ? t("mail.account.delete.error") : undefined}
        confirmShortcutHint={shortcutHints?.submit}
      />
    </div>
  );
}
