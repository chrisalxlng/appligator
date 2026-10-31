import type { StatusCount } from "@appligator/shared";
import { useState } from "react";

export const minFilterStatuses = 2;

// The filter falls back to all entries once it is hidden or its status has no entries left.
export function useStatusFilter<Status extends string>(counts: StatusCount<Status>[] | undefined) {
  const [selected, setSelected] = useState<Status | null>(null);
  const isAvailable =
    counts !== undefined &&
    counts.length >= minFilterStatuses &&
    counts.some(({ status }) => status === selected);
  return [isAvailable ? selected : null, setSelected] as const;
}
