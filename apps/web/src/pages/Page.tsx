import { LogoMark } from "@appligator/ui";
import type { ReactNode } from "react";
import { HomeLink } from "../shell/HomeLink.tsx";
import styles from "./Page.module.css";

interface PageProps {
  title: string;
  actions?: ReactNode;
  hideHeader?: boolean;
  compactTitle?: { title: string; subtitle: string };
  className?: string;
  children?: ReactNode;
}

export function Page({ title, actions, hideHeader, compactTitle, className, children }: PageProps) {
  return (
    <div className={`${styles.page} ${className ?? ""}`}>
      {!hideHeader && (
        <header className={styles.header} data-compact={compactTitle ? "" : undefined}>
          {compactTitle ? (
            <div className={styles.compactTitle}>
              <h1 className={styles.compactPageHeading}>{title}</h1>
              <p className={styles.compactHeading}>{compactTitle.title}</p>
              <p className={styles.compactSubtitle}>{compactTitle.subtitle}</p>
            </div>
          ) : (
            <>
              <HomeLink className={styles.homeLink}>
                <LogoMark />
              </HomeLink>
              <h1 className={styles.title}>{title}</h1>
            </>
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}
