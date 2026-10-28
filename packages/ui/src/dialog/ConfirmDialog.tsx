import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { KeyboardEvent } from "react";
import { Button } from "../button/Button.tsx";
import { isSubmitShortcut, submitKeyShortcuts } from "../shortcut/submitShortcut.ts";
import { Tooltip } from "../tooltip/Tooltip.tsx";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  error?: string;
  confirmShortcutHint?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending = false,
  error,
  confirmShortcutHint,
}: ConfirmDialogProps) {
  function confirmOnShortcut(event: KeyboardEvent) {
    if (!isSubmitShortcut(event)) return;

    event.preventDefault();
    if (!pending) onConfirm();
  }

  const confirmButton = (
    <Button
      variant="destructive"
      onClick={onConfirm}
      pending={pending}
      aria-keyshortcuts={submitKeyShortcuts}
    >
      {confirmLabel}
    </Button>
  );

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Viewport className={styles.viewport}>
          <AlertDialog.Popup className={styles.popup} onKeyDown={confirmOnShortcut}>
            <AlertDialog.Title className={styles.title}>{title}</AlertDialog.Title>
            <AlertDialog.Description className={styles.description}>
              {description}
            </AlertDialog.Description>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <AlertDialog.Close render={<Button variant="secondary" />}>
                {cancelLabel}
              </AlertDialog.Close>
              {confirmShortcutHint ? (
                <Tooltip label={confirmShortcutHint}>{confirmButton}</Tooltip>
              ) : (
                confirmButton
              )}
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
