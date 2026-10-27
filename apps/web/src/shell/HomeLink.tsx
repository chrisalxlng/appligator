import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import styles from "./HomeLink.module.css";

interface HomeLinkProps {
  children: ReactNode;
  className?: string;
}

export function HomeLink({ children, className }: HomeLinkProps) {
  const { t } = useTranslation();

  return (
    <Link
      to="/"
      aria-label={t("brand.homeLink")}
      className={`${styles.homeLink} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
