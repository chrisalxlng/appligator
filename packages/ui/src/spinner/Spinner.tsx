import styles from "./Spinner.module.css";
import { SpinnerCircle } from "./SpinnerCircle.tsx";

export interface SpinnerProps {
  label: string;
}

export function Spinner({ label }: SpinnerProps) {
  return (
    <output className={styles.spinner}>
      <SpinnerCircle size={32} />
      <span className={styles.label}>{label}</span>
    </output>
  );
}
