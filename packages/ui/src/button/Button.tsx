import { Button as BaseButton } from "@base-ui/react/button";
import { buttonClassName, type ButtonVariant } from "./buttonClassName.ts";

export interface ButtonProps extends Omit<BaseButton.Props, "className"> {
  variant?: ButtonVariant;
  className?: string;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const classNames = [buttonClassName(variant), className].filter(Boolean).join(" ");

  return <BaseButton className={classNames} {...props} />;
}
