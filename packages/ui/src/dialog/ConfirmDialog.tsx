import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "../button/Button.tsx";
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
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={styles.backdrop} />
        <AlertDialog.Viewport className={styles.viewport}>
          <AlertDialog.Popup className={styles.popup}>
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
              <Button variant="destructive" onClick={onConfirm} pending={pending}>
                {confirmLabel}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
