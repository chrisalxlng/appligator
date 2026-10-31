import type { Counts } from "@appligator/shared";
import { useTranslation } from "react-i18next";
import styles from "./StatusFilter.module.css";
import { favoritesFilter, filterOptions, type CollectionFilter } from "./useStatusFilter.ts";

interface FilterOption<Status extends string> {
  filter: CollectionFilter<Status>;
  count: number;
  label: string;
}

interface StatusFilterProps<Status extends string> {
  counts: Counts<Status> | undefined;
  selected: CollectionFilter<Status>;
  onSelect: (filter: CollectionFilter<Status>) => void;
  statusLabel: (status: Status) => string;
}

export function StatusFilter<Status extends string>({
  counts,
  selected,
  onSelect,
  statusLabel,
}: StatusFilterProps<Status>) {
  const { t } = useTranslation();
  if (!counts) return null;

  const { statuses, favorites } = filterOptions(counts);
  const options: FilterOption<Status>[] = statuses.map(({ status, count }) => ({
    filter: status,
    count,
    label: statusLabel(status),
  }));
  if (favorites !== null) {
    options.push({ filter: favoritesFilter, count: favorites, label: t("common.favorites") });
  }
  if (options.length === 0) return null;

  const total = counts.statuses.reduce((sum, { count }) => sum + count, 0);
  const allOption: FilterOption<Status> = {
    filter: null,
    count: total,
    label: t("common.allStatuses"),
  };

  return (
    <fieldset aria-label={t("common.statusFilter")} className={styles.filter}>
      {[allOption, ...options].map(({ filter, count, label }) => (
        <button
          key={filter ?? "all"}
          type="button"
          className={styles.option}
          aria-pressed={filter === selected}
          onClick={() => onSelect(filter)}
        >
          <span className={styles.count}>{count}</span> {label}
        </button>
      ))}
    </fieldset>
  );
}
