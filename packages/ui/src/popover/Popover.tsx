import { Popover as BasePopover } from "@base-ui/react/popover";
import { IconX } from "@tabler/icons-react";
import type { ReactNode, RefObject } from "react";
import { IconButton } from "../button/IconButton.tsx";
import styles from "./Popover.module.css";

export interface PopoverProps {
  title: string;
  closeLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLElement | null>;
  initialFocus?: RefObject<HTMLElement | null>;
  finalFocus?: RefObject<HTMLElement | null> | false;
  children: ReactNode;
}

export function Popover({
  title,
  closeLabel,
  open,
  onOpenChange,
  anchor,
  initialFocus,
  finalFocus = anchor,
  children,
}: PopoverProps) {
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      <BasePopover.Portal>
        <BasePopover.Positioner
          anchor={anchor}
          sideOffset={8}
          align="end"
          className={styles.positioner}
        >
          <BasePopover.Popup
            initialFocus={initialFocus}
            finalFocus={finalFocus}
            className={styles.popup}
          >
            <div className={styles.header}>
              <BasePopover.Title className={styles.title}>{title}</BasePopover.Title>
              <BasePopover.Close
                render={
                  <IconButton variant="secondary" size="small" label={closeLabel}>
                    <IconX size={16} stroke={2.4} aria-hidden />
                  </IconButton>
                }
              />
            </div>
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
