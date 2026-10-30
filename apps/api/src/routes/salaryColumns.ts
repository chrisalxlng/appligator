import type { Salary } from "@appligator/shared";

interface SalaryColumns {
  salaryCurrency: Salary["currency"] | null;
  salaryPeriod: Salary["period"] | null;
  salaryMin: number | null;
  salaryMax: number | null;
}

export function toSalaryColumns<Input extends { salary: Salary | null }>({
  salary,
  ...input
}: Input) {
  return {
    ...input,
    salaryCurrency: salary?.currency ?? null,
    salaryPeriod: salary?.period ?? null,
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
  };
}

export function fromSalaryColumns<Row extends SalaryColumns>({
  salaryCurrency,
  salaryPeriod,
  salaryMin,
  salaryMax,
  ...row
}: Row) {
  const hasSalary =
    salaryCurrency !== null && salaryPeriod !== null && salaryMin !== null && salaryMax !== null;

  return {
    ...row,
    salary: hasSalary
      ? { currency: salaryCurrency, period: salaryPeriod, min: salaryMin, max: salaryMax }
      : null,
  };
}
