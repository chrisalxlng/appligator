import { useState } from "react";
import styles from "./Footer.module.css";

export function Footer({ className }: { className?: string }) {
  const [year] = useState(() => new Date().getFullYear());

  return (
    <footer className={`${styles.footer} ${className ?? ""}`}>
      © {year} Christopher Lang · v{import.meta.env.VITE_APP_VERSION}
    </footer>
  );
}
