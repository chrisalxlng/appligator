import { IconButton, Menu } from "@appligator/ui";
import { IconDots } from "@tabler/icons-react";
import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FloatingActions } from "../shell/FloatingActions.tsx";
import { useIsDesktop } from "../shell/useMediaQuery.ts";
import styles from "./DetailActions.module.css";

interface DetailActionsProps {
  buttons: ReactNode[];
  menuItems: ReactNode;
  error?: string | false;
}

export function DetailActions({ buttons, menuItems, error }: DetailActionsProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  const buttonList = buttons.map((button, index) => <Fragment key={index}>{button}</Fragment>);
  const menu = (
    <Menu
      trigger={
        <IconButton variant="surface" label={t("common.moreActions")}>
          <IconDots size={20} stroke={2.4} aria-hidden />
        </IconButton>
      }
    >
      {menuItems}
    </Menu>
  );

  return (
    <>
      {isDesktop ? (
        <div className={styles.actions}>
          {buttonList}
          {menu}
        </div>
      ) : (
        <FloatingActions>
          {menu}
          {buttonList.toReversed()}
        </FloatingActions>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
}
