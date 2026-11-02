import { Badge } from "@appligator/ui";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMailMessageCount } from "../mail/mailQueries.ts";
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
  const { data: inboxCount } = useMailMessageCount();

  return (
    <aside className={styles.sidebar}>
      <Brand />
      <nav ref={navRef} aria-label={t("navigation.label")} className={styles.nav}>
        <ActiveIndicator rect={activeLinkRect} className={styles.indicator} />
        {navigationItems.map(({ to, labelKey, icon: Icon }) => (
          <Link key={to} to={to} className={styles.link} activeOptions={{ exact: to === "/" }}>
            <Icon size={20} stroke={2.4} aria-hidden />
            {t(`navigation.${labelKey}`)}
            {to === "/inbox" && !!inboxCount && (
              <span className={styles.count}>
                <Badge tone="info">{inboxCount}</Badge>
              </span>
            )}
          </Link>
        ))}
      </nav>
      <Footer className={styles.footer} />
    </aside>
  );
}
