import { Field as BaseField } from "@base-ui/react/field";
import { createContext, useContext, useId, type ReactNode } from "react";
import styles from "./Field.module.css";

const FieldLabelIdContext = createContext<string | undefined>(undefined);

export function useFieldLabelId() {
  return useContext(FieldLabelIdContext);
}

export interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  const labelId = useId();

  return (
    <BaseField.Root invalid={Boolean(error)} className={styles.field}>
      <BaseField.Label id={labelId} className={styles.label}>
        {label}
      </BaseField.Label>
      <FieldLabelIdContext value={labelId}>{children}</FieldLabelIdContext>
      <BaseField.Error match={Boolean(error)} className={styles.error}>
        {error}
      </BaseField.Error>
    </BaseField.Root>
  );
}
