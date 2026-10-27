import { Link } from "@tanstack/react-router";
import { Brand } from "./Brand.tsx";
import { navigationItems } from "./navigation.ts";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <Brand />
      <nav aria-label="Hauptnavigation" className={styles.nav}>
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
