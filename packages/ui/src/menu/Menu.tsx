import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ReactElement, ReactNode } from "react";
import styles from "./Menu.module.css";

export interface MenuProps {
  trigger: ReactElement;
  children: ReactNode;
}

export function Menu({ trigger, children }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={8} align="end">
          <BaseMenu.Popup className={styles.popup}>{children}</BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export interface MenuItemProps {
  icon?: ReactNode;
  variant?: "default" | "destructive";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function MenuItem({
  icon,
  variant = "default",
  disabled,
  onClick,
  children,
}: MenuItemProps) {
  return (
    <BaseMenu.Item
      className={styles.item}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {children}
    </BaseMenu.Item>
  );
}
