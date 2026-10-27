import { Link } from "@tanstack/react-router";
import { navigationItems } from "./navigation.ts";
import styles from "./TabBar.module.css";

export function TabBar() {
  return (
    <div className={styles.container}>
      <nav aria-label="Hauptnavigation" className={styles.tabBar}>
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
