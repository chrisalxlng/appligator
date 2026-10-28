import { Button as BaseButton } from "@base-ui/react/button";
import { SpinnerCircle } from "../spinner/SpinnerCircle.tsx";
import { buttonClassName, type ButtonVariant } from "./buttonClassName.ts";
import styles from "./Button.module.css";

export interface ButtonProps extends Omit<BaseButton.Props, "className"> {
  variant?: ButtonVariant;
  pending?: boolean;
  className?: string;
}

export function Button({
  variant = "primary",
  pending = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classNames = [buttonClassName(variant), className].filter(Boolean).join(" ");

  return (
    <BaseButton
      className={classNames}
      disabled={disabled || pending}
      focusableWhenDisabled={pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? (
        <>
          <span className={styles.pendingContent}>{children}</span>
          <SpinnerCircle size={20} className={styles.spinner} />
        </>
      ) : (
        children
      )}
    </BaseButton>
  );
}
