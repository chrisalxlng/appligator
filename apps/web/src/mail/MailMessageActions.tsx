import type { MailMessage } from "@appligator/shared";
import { Button, ConfirmDialog, IconButton, Menu, MenuItem, useSuccessToast } from "@appligator/ui";
import { IconDots, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import detailActionsStyles from "../collection/DetailActions.module.css";
import { FloatingActions } from "../shell/FloatingActions.tsx";
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { AssignMailPicker } from "./AssignMailPicker.tsx";
import { useDismissMailMessage } from "./mailQueries.ts";

export function MailMessageActions({ message }: { message: MailMessage }) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const dismiss = useDismissMailMessage(message.id);
  const [isConfirmingDismiss, setIsConfirmingDismiss] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();

  if (message.status === "assigned") return null;

  function confirmDismiss() {
    dismiss.mutate(undefined, {
      onSuccess: () => {
        setIsConfirmingDismiss(false);
        showSuccess(t("emails.toast.dismissed"));
      },
    });
  }

  function askToDismiss() {
    dismiss.reset();
    setIsConfirmingDismiss(true);
  }

  const canDismiss = message.status === "pending";
  const assignPicker = <AssignMailPicker key={message.id} message={message} />;

  return (
    <>
      {isDesktop ? (
        <div className={detailActionsStyles.actions}>
          {assignPicker}
          {canDismiss && (
            <Button variant="surface" onClick={askToDismiss}>
              {t("emails.dismiss.action")}
            </Button>
          )}
        </div>
      ) : (
        <FloatingActions>
          {assignPicker}
          {canDismiss && (
            <Menu
              trigger={
                <IconButton variant="surface" label={t("common.moreActions")}>
                  <IconDots size={20} stroke={2.4} aria-hidden />
                </IconButton>
              }
            >
              <MenuItem icon={<IconX size={18} stroke={2} aria-hidden />} onClick={askToDismiss}>
                {t("emails.dismiss.action")}
              </MenuItem>
            </Menu>
          )}
        </FloatingActions>
      )}
      <ConfirmDialog
        open={isConfirmingDismiss}
        onOpenChange={setIsConfirmingDismiss}
        title={t("emails.dismiss.title")}
        description={t("emails.dismiss.description")}
        confirmLabel={t("emails.dismiss.confirm")}
        cancelLabel={t("emails.dismiss.cancel")}
        onConfirm={confirmDismiss}
        pending={dismiss.isPending}
        error={dismiss.isError ? t("emails.dismiss.error") : undefined}
        confirmShortcutHint={shortcutHints?.submit}
        confirmVariant="primary"
      />
    </>
  );
}
