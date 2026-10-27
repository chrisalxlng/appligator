import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { ActiveIndicator } from "./ActiveIndicator.tsx";
import { Brand } from "./Brand.tsx";
import { navigationItems } from "./navigation.ts";
import styles from "./Sidebar.module.css";
import { useActiveLinkRect } from "./useActiveLinkRect.ts";

export function Sidebar() {
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRect = useActiveLinkRect(navRef);

  return (
    <aside className={styles.sidebar}>
      <Brand />
      <nav ref={navRef} aria-label="Hauptnavigation" className={styles.nav}>
        <ActiveIndicator rect={activeLinkRect} className={styles.indicator} />
        {navigationItems.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={styles.link} activeOptions={{ exact: to === "/" }}>
            <Icon size={20} stroke={2.4} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
