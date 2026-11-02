import { Badge } from "@appligator/ui";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePendingMailCount } from "../mail/mailQueries.ts";
import { ActiveIndicator } from "./ActiveIndicator.tsx";
import { Brand } from "./Brand.tsx";
import { Footer } from "./Footer.tsx";
import { useNavigationItems } from "./navigation.ts";
import styles from "./Sidebar.module.css";
import { useActiveLinkRect } from "./useActiveLinkRect.ts";

export function Sidebar() {
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const navigationItems = useNavigationItems();
  const activeLinkRect = useActiveLinkRect(navRef, navigationItems.length);
  const pendingMailCount = usePendingMailCount();

  return (
    <aside className={styles.sidebar}>
      <Brand />
      <nav ref={navRef} aria-label={t("navigation.label")} className={styles.nav}>
        <ActiveIndicator rect={activeLinkRect} className={styles.indicator} />
        {navigationItems.map(({ to, labelKey, icon: Icon }) => (
          <Link key={to} to={to} className={styles.link} activeOptions={{ exact: to === "/" }}>
            {({ isActive }) => (
              <>
                <Icon size={20} stroke={2.4} aria-hidden />
                {t(`navigation.${labelKey}`)}
                {to === "/emails" && !!pendingMailCount && (
                  <span className={styles.count}>
                    <Badge tone={isActive ? "active" : "info"}>{pendingMailCount}</Badge>
                  </span>
                )}
              </>
            )}
          </Link>
        ))}
      </nav>
      <Footer className={styles.footer} />
    </aside>
  );
}
