import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  illustration: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div className={styles.emptyState}>
      <div className={styles.illustration}>{illustration}</div>
      <div className={styles.text}>
        <Heading className={styles.title}>{title}</Heading>
        <p className={styles.description}>{description}</p>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
