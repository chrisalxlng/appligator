import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./FloatingActions.module.css";

export const FloatingActionsSlotContext = createContext<HTMLElement | null>(null);

export function FloatingActions({ children }: { children: ReactNode }) {
  const slot = useContext(FloatingActionsSlotContext);
  if (!slot) return null;

  return createPortal(<div className={styles.actions}>{children}</div>, slot);
}
