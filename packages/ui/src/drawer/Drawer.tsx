import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { IconX } from "@tabler/icons-react";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { IconButton } from "../button/IconButton.tsx";
import { isSubmitShortcut } from "../shortcut/submitShortcut.ts";
import styles from "./Drawer.module.css";

const IsNestedContext = createContext(false);

export interface DrawerProps {
  title: string;
  closeLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactElement;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

function submitOnShortcut(event: KeyboardEvent<HTMLDivElement>) {
  if (!isSubmitShortcut(event)) return;

  // React bubbles events through portals, so a parent drawer would submit as well.
  event.stopPropagation();
  event.preventDefault();
  event.currentTarget.querySelector<HTMLButtonElement>('form button[type="submit"]')?.click();
}

// React bubbles events through portals, so a form around the drawer would submit as well.
function stopSubmitAtDrawer(event: FormEvent) {
  event.stopPropagation();
}

// iOS only opens the keyboard for a focus call during the tap, but Base UI focuses a frame later.
function FocusDuringTap({ target }: { target: RefObject<HTMLElement | null> }) {
  useLayoutEffect(() => {
    target.current?.focus({ preventScroll: true });
  }, [target]);

  return null;
}

export function Drawer({
  title,
  closeLabel,
  open,
  onOpenChange,
  trigger,
  initialFocus,
  children,
}: DrawerProps) {
  const isNested = useContext(IsNestedContext);
  const popupRef = useRef<HTMLDivElement>(null);
  const returnTargetRef = useRef<Element | null>(null);

  useLayoutEffect(() => {
    if (open) returnTargetRef.current = document.activeElement;
  }, [open]);

  return (
    <BaseDrawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <BaseDrawer.Trigger render={trigger} />}
      <BaseDrawer.VirtualKeyboardProvider>
        <BaseDrawer.Portal>
          {!isNested && <BaseDrawer.Backdrop className={styles.backdrop} />}
          <BaseDrawer.Viewport className={styles.viewport}>
            <BaseDrawer.Popup
              ref={popupRef}
              initialFocus={initialFocus ?? popupRef}
              finalFocus={() =>
                returnTargetRef.current?.isConnected === false
                  ? document.querySelector<HTMLElement>("main")
                  : true
              }
              className={styles.popup}
              onKeyDown={submitOnShortcut}
              onSubmit={stopSubmitAtDrawer}
            >
              <div className={styles.header}>
                <BaseDrawer.Title className={styles.title}>{title}</BaseDrawer.Title>
                <BaseDrawer.Close
                  className={styles.close}
                  render={
                    <IconButton variant="secondary" size="small" label={closeLabel}>
                      <IconX size={16} stroke={2.4} aria-hidden />
                    </IconButton>
                  }
                />
              </div>
              <BaseDrawer.Content className={styles.content}>
                <IsNestedContext value>{children}</IsNestedContext>
              </BaseDrawer.Content>
              {initialFocus && <FocusDuringTap target={initialFocus} />}
            </BaseDrawer.Popup>
          </BaseDrawer.Viewport>
        </BaseDrawer.Portal>
      </BaseDrawer.VirtualKeyboardProvider>
    </BaseDrawer.Root>
  );
}
