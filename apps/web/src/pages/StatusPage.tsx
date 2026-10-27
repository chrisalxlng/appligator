import type { ReactNode } from "react";
import { Brand } from "../shell/Brand.tsx";
import styles from "./StatusPage.module.css";

interface StatusPageProps {
  illustration: string;
  title: string;
  description: string;
  action: ReactNode;
}

export function StatusPage({ illustration, title, description, action }: StatusPageProps) {
  return (
    <div className={styles.page}>
      <Brand />
      <main className={styles.content}>
        <img src={illustration} alt="" width={225} height={224} />
        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.action}>{action}</div>
      </main>
    </div>
  );
}
