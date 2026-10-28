import { IconPlus } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import styles from "./AddButton.module.css";

export type AddButtonProps = Omit<ComponentProps<"button">, "type">;

export function AddButton({ className, children, ...props }: AddButtonProps) {
  return (
    <button type="button" className={`${styles.addButton} ${className ?? ""}`} {...props}>
      <IconPlus size={20} stroke={2.4} aria-hidden />
      {children}
    </button>
  );
}
