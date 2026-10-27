import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { ActiveIndicator } from "./ActiveIndicator.tsx";
import { navigationItems } from "./navigation.ts";
import styles from "./TabBar.module.css";
import { useActiveLinkRect } from "./useActiveLinkRect.ts";

export function TabBar() {
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRect = useActiveLinkRect(navRef);

  return (
    <div className={styles.container}>
      <nav ref={navRef} aria-label="Hauptnavigation" className={styles.tabBar}>
        <ActiveIndicator rect={activeLinkRect} className={styles.indicator} />
        {navigationItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
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
