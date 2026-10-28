import { Tooltip } from "@appligator/ui";
import type { ReactElement } from "react";

export function ShortcutTooltip({ hint, children }: { hint?: string; children: ReactElement }) {
  return hint ? <Tooltip label={hint}>{children}</Tooltip> : children;
}
