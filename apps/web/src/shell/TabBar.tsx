import { Link } from "@tanstack/react-router";
import { useRef, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { ActiveIndicator } from "./ActiveIndicator.tsx";
import { navigationItems } from "./navigation.ts";
import styles from "./TabBar.module.css";
import { useActiveLinkRect } from "./useActiveLinkRect.ts";

interface TabBarProps {
  floatingActionsRef: Ref<HTMLDivElement>;
}

export function TabBar({ floatingActionsRef }: TabBarProps) {
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRect = useActiveLinkRect(navRef);

  return (
    <div className={styles.container}>
      <div ref={floatingActionsRef} className={styles.floatingActions} />
      <nav ref={navRef} aria-label={t("navigation.label")} className={styles.tabBar}>
        <ActiveIndicator rect={activeLinkRect} className={styles.indicator} />
        {navigationItems.map(({ to, labelKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={t(`navigation.${labelKey}`)}
            className={styles.tab}
            activeOptions={{ exact: to === "/" }}
          >
            <Icon size={20} stroke={2.4} aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}
