import { Field as BaseField } from "@base-ui/react/field";
import { createContext, useContext, useId, type ReactNode } from "react";
import styles from "./Field.module.css";

const FieldContext = createContext<{ labelId: string; errorId: string; invalid: boolean } | null>(
  null,
);

export function useFieldContext() {
  return useContext(FieldContext);
}

export interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  const labelId = useId();
  const errorId = useId();
  const invalid = Boolean(error);

  return (
    <BaseField.Root invalid={invalid} className={styles.field}>
      <BaseField.Label id={labelId} className={styles.label}>
        {label}
      </BaseField.Label>
      <FieldContext value={{ labelId, errorId, invalid }}>{children}</FieldContext>
      <BaseField.Error id={errorId} match={invalid} className={styles.error}>
        {error}
      </BaseField.Error>
    </BaseField.Root>
  );
}
