import { LinkButton } from "@appligator/ui";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import notFoundIllustration from "../assets/not-found.svg";
import { Brand } from "../shell/Brand.tsx";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <Brand />
      <main className={styles.content}>
        <img src={notFoundIllustration} alt="" width={225} height={224} />
        <div className={styles.text}>
          <h1 className={styles.title}>Seite nicht gefunden</h1>
          <p className={styles.description}>
            Die gesuchte Seite existiert nicht mehr oder wurde verschoben.
          </p>
        </div>
        <LinkButton className={styles.action} render={<Link to="/" />}>
          <IconArrowRight size={20} stroke={2.4} aria-hidden />
          Startseite öffnen
        </LinkButton>
      </main>
    </div>
  );
}
