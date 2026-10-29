import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActiveIndicator } from "./ActiveIndicator.tsx";
import { Brand } from "./Brand.tsx";
import { Footer } from "./Footer.tsx";
import { navigationItems } from "./navigation.ts";
import styles from "./Sidebar.module.css";
import { useActiveLinkRect } from "./useActiveLinkRect.ts";

export function Sidebar() {
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRect = useActiveLinkRect(navRef);

  return (
    <aside className={styles.sidebar}>
      <Brand />
      <nav ref={navRef} aria-label={t("navigation.label")} className={styles.nav}>
        <ActiveIndicator rect={activeLinkRect} className={styles.indicator} />
        {navigationItems.map(({ to, labelKey, icon: Icon }) => (
          <Link key={to} to={to} className={styles.link} activeOptions={{ exact: to === "/" }}>
            <Icon size={20} stroke={2.4} aria-hidden />
            {t(`navigation.${labelKey}`)}
          </Link>
        ))}
      </nav>
      <Footer className={styles.footer} />
    </aside>
  );
}
