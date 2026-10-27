import styles from "./ActiveIndicator.module.css";
import type { LinkRect } from "./useActiveLinkRect.ts";

interface ActiveIndicatorProps {
  rect: LinkRect | null;
  className: string;
}

export function ActiveIndicator({ rect, className }: ActiveIndicatorProps) {
  if (!rect) return null;

  return (
    <span
      aria-hidden
      className={`${styles.indicator} ${className}`}
      style={{
        width: rect.width,
        height: rect.height,
        transform: `translate(${rect.left}px, ${rect.top}px)`,
      }}
    />
  );
}
