import { LogoMark } from "@appligator/ui";
import type { ReactNode } from "react";
import { HomeLink } from "../shell/HomeLink.tsx";
import styles from "./Page.module.css";

interface PageProps {
  title: string;
  actions?: ReactNode;
  hideHeader?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Page({ title, actions, hideHeader, className, children }: PageProps) {
  return (
    <div className={`${styles.page} ${className ?? ""}`}>
      {!hideHeader && (
        <header className={styles.header}>
          <HomeLink className={styles.homeLink}>
            <LogoMark />
          </HomeLink>
          <h1 className={styles.title}>{title}</h1>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}
