import { Button, IconButton, Menu, MenuItem } from "@appligator/ui";
import { IconDots, IconPencil } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FloatingActions } from "../shell/FloatingActions.tsx";
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import { ShortcutTooltip } from "../shortcuts/ShortcutTooltip.tsx";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import styles from "./DetailActions.module.css";
import { PinMenuItem, type PinMenuItemProps } from "./PinMenuItem.tsx";

interface DetailActionsProps extends PinMenuItemProps {
  primaryAction: ReactNode;
  edit?: { label: string; onClick: () => void };
  deleteItem?: ReactNode;
}

export function DetailActions({
  primaryAction,
  edit,
  deleteItem,
  pinned,
  pin,
}: DetailActionsProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const shortcutHints = useShortcutHints();

  const menu = (
    <Menu
      trigger={
        <IconButton variant="surface" label={t("common.moreActions")}>
          <IconDots size={20} stroke={2.4} aria-hidden />
        </IconButton>
      }
    >
      {edit && !isDesktop && (
        <MenuItem icon={<IconPencil size={18} stroke={2} aria-hidden />} onClick={edit.onClick}>
          {edit.label}
        </MenuItem>
      )}
      <PinMenuItem pinned={pinned} pin={pin} />
      {deleteItem}
    </Menu>
  );

  return (
    <>
      {isDesktop ? (
        <div className={styles.actions}>
          {primaryAction}
          {edit && (
            <ShortcutTooltip hint={shortcutHints?.alt("E")}>
              <Button variant="surface" onClick={edit.onClick} aria-keyshortcuts="Alt+E">
                {edit.label}
              </Button>
            </ShortcutTooltip>
          )}
          {menu}
        </div>
      ) : (
        <FloatingActions>
          {menu}
          {primaryAction}
        </FloatingActions>
      )}
      {pin.isError && (
        <p role="alert" className={styles.error}>
          {t("common.pinError")}
        </p>
      )}
    </>
  );
}
