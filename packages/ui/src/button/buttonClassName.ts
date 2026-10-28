import styles from "./Button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "surface"
  | "destructive"
  | "highlightSecondary"
  | "destructiveSecondary";

export function buttonClassName(variant: ButtonVariant) {
  return `${styles.button} ${styles[variant]}`;
}
