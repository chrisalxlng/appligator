import { LinkButton } from "@appligator/ui";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import notFoundIllustration from "../assets/not-found.svg";
import { Brand } from "../shell/Brand.tsx";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Brand />
      <main className={styles.content}>
        <img src={notFoundIllustration} alt="" width={225} height={224} />
        <div className={styles.text}>
          <h1 className={styles.title}>{t("notFound.title")}</h1>
          <p className={styles.description}>{t("notFound.description")}</p>
        </div>
        <LinkButton className={styles.action} render={<Link to="/" />}>
          <IconArrowRight size={20} stroke={2.4} aria-hidden />
          {t("notFound.openHomePage")}
        </LinkButton>
      </main>
    </div>
  );
}
