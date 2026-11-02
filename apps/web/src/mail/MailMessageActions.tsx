import type { MailMessage } from "@appligator/shared";
import { Button, ConfirmDialog, IconButton, Menu, MenuItem, useSuccessToast } from "@appligator/ui";
import { IconDots, IconX } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import detailActionsStyles from "../collection/DetailActions.module.css";
import { FloatingActions } from "../shell/FloatingActions.tsx";
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { AssignMailPicker } from "./AssignMailPicker.tsx";
import { useDismissMailMessage, useUnassignMailMessage } from "./mailQueries.ts";

export function MailMessageActions({ message }: { message: MailMessage }) {
  const isAssigned = message.status === "assigned" || message.status === "autoAssigned";
  return isAssigned ? <UnassignAction message={message} /> : <OpenActions message={message} />;
}

function Actions({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  return isDesktop ? (
    <div className={detailActionsStyles.actions}>{children}</div>
  ) : (
    <FloatingActions>{children}</FloatingActions>
  );
}

function UnassignAction({ message }: { message: MailMessage }) {
  const { t } = useTranslation();
  const unassign = useUnassignMailMessage(message.id);
  const [isConfirming, setIsConfirming] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();

  function confirm() {
    unassign.mutate(undefined, {
      onSuccess: () => {
        setIsConfirming(false);
        showSuccess(t("emails.toast.unassigned"));
      },
    });
  }

  return (
    <>
      <Actions>
        <Button
          variant="surface"
          onClick={() => {
            unassign.reset();
            setIsConfirming(true);
          }}
        >
          {t("emails.unassign.action")}
        </Button>
      </Actions>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title={t("emails.unassign.title")}
        description={t("emails.unassign.description")}
        confirmLabel={t("emails.unassign.confirm")}
        cancelLabel={t("emails.unassign.cancel")}
        onConfirm={confirm}
        pending={unassign.isPending}
        error={unassign.isError ? t("emails.unassign.error") : undefined}
        confirmShortcutHint={shortcutHints?.submit}
      />
    </>
  );
}

function OpenActions({ message }: { message: MailMessage }) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const dismiss = useDismissMailMessage(message.id);
  const [isConfirmingDismiss, setIsConfirmingDismiss] = useState(false);
  const showSuccess = useSuccessToast();
  const shortcutHints = useShortcutHints();

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

  return (
    <>
      <Actions>
        <AssignMailPicker key={message.id} message={message} />
        {canDismiss &&
          (isDesktop ? (
            <Button variant="surface" onClick={askToDismiss}>
              {t("emails.dismiss.action")}
            </Button>
          ) : (
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
          ))}
      </Actions>
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
