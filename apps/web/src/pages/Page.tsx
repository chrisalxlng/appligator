import { LogoMark } from "@appligator/ui";
import type { ReactNode } from "react";
import { HomeLink } from "../shell/HomeLink.tsx";
import styles from "./Page.module.css";

interface PageProps {
  title: string;
  actions?: ReactNode;
  headerOnMobileOnly?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Page({ title, actions, headerOnMobileOnly, className, children }: PageProps) {
  return (
    <div className={`${styles.page} ${className ?? ""}`}>
      <header className={styles.header} data-mobile-only={headerOnMobileOnly || undefined}>
        <HomeLink className={styles.homeLink}>
          <LogoMark />
        </HomeLink>
        <h1 className={styles.title}>{title}</h1>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}
