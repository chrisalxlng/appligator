import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { IconArrowUpRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import styles from "./LinkChip.module.css";

export interface LinkChipProps extends useRender.ComponentProps<"a"> {
  badge?: ReactNode;
}

export function LinkChip({ badge, render, children, ...props }: LinkChipProps) {
  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        className: styles.chip,
        children: (
          <>
            <span className={styles.label}>
              <IconArrowUpRight className={styles.icon} size={14} stroke={2} aria-hidden />
              <span className={styles.text}>{children}</span>
            </span>
            {badge}
          </>
        ),
      },
      props,
    ),
  });
}
