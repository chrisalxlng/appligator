import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Tooltip } from "../tooltip/Tooltip.tsx";
import styles from "./ClearableControl.module.css";

export type ClearableProps = { clearable?: false } | { clearable: true; clearLabel: string };

interface ClearableControlProps {
  canClear: boolean;
  clearLabel: string;
  onClear: () => void;
  children: ReactNode;
}

export function ClearableControl({
  canClear,
  clearLabel,
  onClear,
  children,
}: ClearableControlProps) {
  return (
    <div className={styles.clearable} data-can-clear={canClear || undefined}>
      {children}
      {canClear && (
        <Tooltip label={clearLabel}>
          <button
            type="button"
            className={styles.clearButton}
            aria-label={clearLabel}
            onClick={onClear}
          >
            <IconX size={16} stroke={2.4} aria-hidden />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
