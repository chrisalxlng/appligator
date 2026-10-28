import styles from "./Spinner.module.css";

export interface SpinnerProps {
  label: string;
}

export function Spinner({ label }: SpinnerProps) {
  return (
    <output className={styles.spinner}>
      <svg className={styles.circle} viewBox="0 0 24 24" aria-hidden="true">
        <circle className={styles.track} cx="12" cy="12" r="10" />
        <circle className={styles.indicator} cx="12" cy="12" r="10" />
      </svg>
      <span className={styles.label}>{label}</span>
    </output>
  );
}
