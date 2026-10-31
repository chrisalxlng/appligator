import type { StatusCount } from "@appligator/shared";
import { useTranslation } from "react-i18next";
import styles from "./StatusFilter.module.css";
import { minFilterStatuses } from "./useStatusFilter.ts";

interface StatusFilterProps<Status extends string> {
  counts: StatusCount<Status>[];
  selected: Status | null;
  onSelect: (status: Status | null) => void;
  statusLabel: (status: Status) => string;
}

export function StatusFilter<Status extends string>({
  counts,
  selected,
  onSelect,
  statusLabel,
}: StatusFilterProps<Status>) {
  const { t } = useTranslation();

  if (counts.length < minFilterStatuses) return null;

  const total = counts.reduce((sum, { count }) => sum + count, 0);
  const options = [
    { status: null, count: total, label: t("common.allStatuses") },
    ...counts.map(({ status, count }) => ({ status, count, label: statusLabel(status) })),
  ];

  return (
    <fieldset aria-label={t("common.statusFilter")} className={styles.filter}>
      {options.map(({ status, count, label }) => (
        <button
          key={status ?? "all"}
          type="button"
          className={styles.option}
          aria-pressed={status === selected}
          onClick={() => onSelect(status)}
        >
          <span className={styles.count}>{count}</span> {label}
        </button>
      ))}
    </fieldset>
  );
}
