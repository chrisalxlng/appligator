import { LogoMark } from "@appligator/ui";
import styles from "./Page.module.css";

interface PageProps {
  title: string;
}

export function Page({ title }: PageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <LogoMark className={styles.logo} />
        <h1 className={styles.title}>{title}</h1>
      </header>
    </div>
  );
}
