import { Toast as BaseToast } from "@base-ui/react/toast";
import { IconCheck } from "@tabler/icons-react";
import { useCallback, type ReactNode } from "react";
import styles from "./Toast.module.css";

const timeoutMs = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <BaseToast.Provider timeout={timeoutMs}>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className={styles.viewport}>
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager();

  return toasts.map((toast) => (
    <BaseToast.Root
      key={toast.id}
      toast={toast}
      swipeDirection={["up", "left", "right"]}
      className={styles.toast}
    >
      <BaseToast.Content className={styles.content}>
        <span className={styles.icon}>
          <IconCheck size={14} stroke={3} aria-hidden />
        </span>
        <BaseToast.Title className={styles.title} />
      </BaseToast.Content>
    </BaseToast.Root>
  ));
}

export function useSuccessToast() {
  const { add } = BaseToast.useToastManager();
  return useCallback((title: string) => void add({ title }), [add]);
}
