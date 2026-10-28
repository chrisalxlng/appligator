import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "surface" | "destructive";

export function buttonClassName(variant: ButtonVariant) {
  return `${styles.button} ${styles[variant]}`;
}
