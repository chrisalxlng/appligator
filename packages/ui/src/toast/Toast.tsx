import { Toast as BaseToast } from "@base-ui/react/toast";
import { IconCheck, type Icon } from "@tabler/icons-react";
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
  const { toasts } = BaseToast.useToastManager<{ icon: Icon }>();

  return toasts.map((toast) => {
    const ToastIcon = toast.data?.icon ?? IconCheck;

    return (
      <BaseToast.Root
        key={toast.id}
        toast={toast}
        swipeDirection={["up", "left", "right"]}
        className={styles.toast}
      >
        <BaseToast.Content className={styles.content}>
          <span className={styles.icon} data-type={toast.type}>
            <ToastIcon size={14} stroke={3} aria-hidden />
          </span>
          <BaseToast.Title className={styles.title} />
        </BaseToast.Content>
      </BaseToast.Root>
    );
  });
}

export function useSuccessToast() {
  const { add } = BaseToast.useToastManager();
  return useCallback((title: string) => void add({ title }), [add]);
}

export function useInfoToast() {
  const { add } = BaseToast.useToastManager<{ icon: Icon }>();
  return useCallback(
    (title: string, icon: Icon) => void add({ title, type: "info", data: { icon } }),
    [add],
  );
}
