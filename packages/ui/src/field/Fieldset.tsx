import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import type { ReactNode } from "react";
import styles from "./Field.module.css";

export interface FieldsetProps {
  legend: string;
  error?: string;
  children: ReactNode;
}

export function Fieldset({ legend, error, children }: FieldsetProps) {
  return (
    <BaseFieldset.Root className={styles.field}>
      <BaseFieldset.Legend className={styles.label}>{legend}</BaseFieldset.Legend>
      {children}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </BaseFieldset.Root>
  );
}
