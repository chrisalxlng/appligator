import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { buttonClassName, type ButtonVariant } from "./buttonClassName.ts";

export interface LinkButtonProps extends useRender.ComponentProps<"a"> {
  variant?: ButtonVariant;
}

export function LinkButton({ variant = "primary", render, ...props }: LinkButtonProps) {
  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">({ className: buttonClassName(variant) }, props),
  });
}
