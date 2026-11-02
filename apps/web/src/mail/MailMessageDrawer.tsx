import type { MailMessageListItem } from "@appligator/shared";
import { Button, ConfirmDialog, Drawer, Spinner, useSuccessToast } from "@appligator/ui";
import { IconLink } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmailContent } from "../attachments/AttachmentCards.tsx";
import { LoadError } from "../loading/LoadError.tsx";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { AssignMailDrawer } from "./AssignMailDrawer.tsx";
import styles from "./MailMessageDrawer.module.css";
import { useDismissMailMessage, useMailMessage } from "./mailQueries.ts";

interface MailMessageDrawerProps {
  message: MailMessageListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MailMessageDrawer({ message, open, onOpenChange }: MailMessageDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer
      title={message ? message.subject || t("inbox.noSubject") : ""}
      closeLabel={t("common.close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      {message && (
        <MailMessageContent key={message.id} id={message.id} onDone={() => onOpenChange(false)} />
      )}
    </Drawer>
  );
}

function MailMessageContent({ id, onDone }: { id: string; onDone: () => void }) {
  const { t } = useTranslation();
  const message = useMailMessage(id);
  const dismiss = useDismissMailMessage(id);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isConfirmingDismiss, setIsConfirmingDismiss] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();

  if (message.isPending) return <Spinner label={t("inbox.message.loading")} />;
  if (message.isError) {
    return (
      <LoadError
        title={t("inbox.message.loadError.title")}
        description={t("inbox.message.loadError.description")}
        onRetry={() => void message.refetch()}
        headingLevel={3}
      />
    );
  }

  function confirmDismiss() {
    dismiss.mutate(undefined, {
      onSuccess: () => {
        setIsConfirmingDismiss(false);
        onDone();
        showSuccess(t("inbox.toast.dismissed"));
      },
    });
  }

  return (
    <div className={styles.message}>
      <EmailContent email={message.data} />
      <div className={styles.actions}>
        <Button onClick={() => setIsAssigning(true)}>
          <IconLink size={20} stroke={2.4} aria-hidden />
          {t("inbox.assign.action")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            dismiss.reset();
            setIsConfirmingDismiss(true);
          }}
        >
          {t("inbox.dismiss.action")}
        </Button>
      </div>
      <AssignMailDrawer
        message={message.data}
        open={isAssigning}
        onOpenChange={setIsAssigning}
        onAssigned={onDone}
      />
      <ConfirmDialog
        open={isConfirmingDismiss}
        onOpenChange={setIsConfirmingDismiss}
        title={t("inbox.dismiss.title")}
        description={t("inbox.dismiss.description")}
        confirmLabel={t("inbox.dismiss.confirm")}
        cancelLabel={t("inbox.dismiss.cancel")}
        onConfirm={confirmDismiss}
        pending={dismiss.isPending}
        error={dismiss.isError ? t("inbox.dismiss.error") : undefined}
        confirmShortcutHint={shortcutHints?.submit}
      />
    </div>
  );
}
