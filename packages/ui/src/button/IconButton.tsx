import { Button, type ButtonProps } from "./Button.tsx";
import styles from "./Button.module.css";

export interface IconButtonProps extends Omit<ButtonProps, "aria-label"> {
  label: string;
}

export function IconButton({ label, className, ...props }: IconButtonProps) {
  const classNames = [styles.iconOnly, className].filter(Boolean).join(" ");

  return <Button aria-label={label} className={classNames} {...props} />;
}
