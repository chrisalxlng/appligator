import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { IconCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";
import styles from "./Checkbox.module.css";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}

export function Checkbox({ checked, onCheckedChange, children }: CheckboxProps) {
  return (
    <label className={styles.checkbox}>
      <BaseCheckbox.Root className={styles.box} checked={checked} onCheckedChange={onCheckedChange}>
        <BaseCheckbox.Indicator className={styles.indicator}>
          <IconCheck size={14} stroke={3} aria-hidden />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      <span className={styles.label}>{children}</span>
    </label>
  );
}
