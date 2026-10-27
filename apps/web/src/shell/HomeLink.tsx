import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import styles from "./HomeLink.module.css";

interface HomeLinkProps {
  children: ReactNode;
  className?: string;
}

export function HomeLink({ children, className }: HomeLinkProps) {
  return (
    <Link
      to="/"
      aria-label="Appligator Startseite"
      className={`${styles.homeLink} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
