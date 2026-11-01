import type { Icon } from "@tabler/icons-react";
import { createContext, useContext, useId, type ReactNode, type Ref } from "react";
import { useTranslation } from "react-i18next";
import styles from "./DetailView.module.css";
import a11y from "./visuallyHidden.module.css";

export const DetailTitleRefContext = createContext<Ref<HTMLElement> | undefined>(undefined);

interface DetailViewProps {
  company: string;
  position: string;
  actions: ReactNode;
  properties: ReactNode;
  children?: ReactNode;
}

export function DetailView({ company, position, actions, properties, children }: DetailViewProps) {
  const titleRef = useContext(DetailTitleRefContext);

  return (
    <article className={styles.detail}>
      <header ref={titleRef} className={styles.header}>
        <p className={styles.company}>{company}</p>
        <h2 className={styles.position}>{position}</h2>
      </header>
      {actions}
      <dl className={`${styles.properties} ${styles.meta}`}>{properties}</dl>
      {children}
    </article>
  );
}

export function PropertyList({ children }: { children: ReactNode }) {
  return <dl className={styles.properties}>{children}</dl>;
}

interface PropertyProps {
  icon: Icon;
  label: string;
  children: ReactNode;
}

export function Property({ icon: PropertyIcon, label, children }: PropertyProps) {
  return (
    <div className={styles.property}>
      <dt className={styles.propertyLabel}>
        <PropertyIcon size={20} stroke={2} aria-hidden />
        <span className={styles.propertyLabelText}>{label}</span>
      </dt>
      <dd className={styles.propertyValue}>{children}</dd>
    </div>
  );
}

export function NotSpecified() {
  const { t } = useTranslation();

  return (
    <>
      <span aria-hidden>—</span>
      <span className={a11y.visuallyHidden}>{t("common.notSpecified")}</span>
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.sectionTitle}>
        {title}
      </h3>
      {children}
    </section>
  );
}
