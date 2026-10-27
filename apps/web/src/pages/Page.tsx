import { LogoMark } from "@appligator/ui";
import type { ReactNode } from "react";
import { HomeLink } from "../shell/HomeLink.tsx";
import styles from "./Page.module.css";

interface PageProps {
  title: string;
  children?: ReactNode;
}

export function Page({ title, children }: PageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <HomeLink className={styles.homeLink}>
          <LogoMark />
        </HomeLink>
        <h1 className={styles.title}>{title}</h1>
      </header>
      {children}
    </div>
  );
}
