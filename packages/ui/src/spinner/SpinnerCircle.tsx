import styles from "./SpinnerCircle.module.css";

export interface SpinnerCircleProps {
  size: number;
  className?: string;
}

export function SpinnerCircle({ size, className }: SpinnerCircleProps) {
  const classNames = [styles.circle, className].filter(Boolean).join(" ");

  return (
    <svg className={classNames} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle className={styles.track} cx="12" cy="12" r="10" />
      <circle className={styles.indicator} cx="12" cy="12" r="10" />
    </svg>
  );
}
