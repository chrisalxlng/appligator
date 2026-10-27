import type { SVGProps } from "react";

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <rect width="48" height="48" rx="10" fill="var(--interactive-fill)" />
      <path
        d="M24 33H18.6553L13.8926 24L9.12988 33H4L14 15L24 33Z"
        fill="var(--interactive-text-primary)"
      />
      <path
        d="M34 33H28.6553L23.8926 24L19.1299 33H14L24 15L34 33Z"
        fill="var(--interactive-text-primary)"
      />
      <path
        d="M44 33H38.6553L33.8926 24L29.1299 33H24L34 15L44 33Z"
        fill="var(--interactive-text-primary)"
      />
    </svg>
  );
}
