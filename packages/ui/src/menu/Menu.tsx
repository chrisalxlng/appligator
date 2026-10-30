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

export interface MenuItemProps extends Omit<BaseMenu.Item.Props, "className" | "onClick"> {
  icon?: ReactNode;
  variant?: "default" | "destructive";
  onClick: () => void;
  children: ReactNode;
}

export function MenuItem({ icon, variant = "default", children, ...props }: MenuItemProps) {
  return (
    <BaseMenu.Item className={styles.item} data-variant={variant} {...props}>
      {icon}
      {children}
    </BaseMenu.Item>
  );
}
