import { Link } from "@tanstack/react-router";
import { useRef, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { ActiveIndicator } from "./ActiveIndicator.tsx";
import { navigationItems } from "./navigation.ts";
import { ScrollToTop } from "./ScrollToTop.tsx";
import styles from "./TabBar.module.css";
import { useActiveLinkRect } from "./useActiveLinkRect.ts";
import { useIsDesktop } from "./useMediaQuery.ts";

interface TabBarProps {
  floatingActionsRef: Ref<HTMLDivElement>;
}

export function TabBar({ floatingActionsRef }: TabBarProps) {
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRect = useActiveLinkRect(navRef);
  const isDesktop = useIsDesktop();

  return (
    <div className={styles.container}>
      {!isDesktop && <ScrollToTop scrollsWith="window" className={styles.scrollToTop} />}
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
