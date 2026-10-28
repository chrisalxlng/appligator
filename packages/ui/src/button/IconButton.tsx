import { Tooltip } from "../tooltip/Tooltip.tsx";
import { Button, type ButtonProps } from "./Button.tsx";
import styles from "./Button.module.css";

export interface IconButtonProps extends Omit<ButtonProps, "aria-label"> {
  label: string;
  size?: "medium" | "small";
}

export function IconButton({ label, size = "medium", className, ...props }: IconButtonProps) {
  const classNames = [styles.iconOnly, size === "small" && styles.small, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tooltip label={label}>
      <Button aria-label={label} className={classNames} {...props} />
    </Tooltip>
  );
}
