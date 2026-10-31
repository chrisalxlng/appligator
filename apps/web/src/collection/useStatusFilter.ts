import type { Counts } from "@appligator/shared";
import { useState } from "react";

export const favoritesFilter = "favorites";
export type CollectionFilter<Status extends string> = Status | typeof favoritesFilter | null;

const minFilterStatuses = 2;

// A single status only repeats "All", so the statuses are offered once there are several.
export function filterOptions<Status extends string>({ statuses, favorites }: Counts<Status>) {
  return {
    statuses: statuses.length >= minFilterStatuses ? statuses : [],
    favorites: favorites > 0 ? favorites : null,
  };
}

export function filterParams<Status extends string>(filter: CollectionFilter<Status>) {
  return filter === favoritesFilter ? { favorite: true } : { status: filter };
}

function isOffered<Status extends string>(
  counts: Counts<Status>,
  filter: CollectionFilter<Status>,
) {
  const { statuses, favorites } = filterOptions(counts);
  return filter === favoritesFilter
    ? favorites !== null
    : statuses.some(({ status }) => status === filter);
}

// The filter falls back to all entries once its option is no longer offered.
export function useStatusFilter<Status extends string>(counts: Counts<Status> | undefined) {
  const [selected, setSelected] = useState<CollectionFilter<Status>>(null);
  const isAvailable = counts !== undefined && isOffered(counts, selected);
  return [isAvailable ? selected : null, setSelected] as const;
}
