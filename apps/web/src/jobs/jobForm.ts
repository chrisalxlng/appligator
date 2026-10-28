import type {
  Currency,
  EmploymentType,
  Job,
  JobInput,
  Salary,
  SalaryPeriod,
  WorkModel,
} from "@appligator/shared";

export interface JobFormValues {
  link: string;
  description: string;
  summary: string;
  company: string;
  position: string;
  salaryCurrency: Currency | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  locations: string[];
  workModel: WorkModel | null;
  employmentType: EmploymentType | null;
  applicationDeadline: string;
}

export type JobFormError =
  | "companyRequired"
  | "positionRequired"
  | "linkInvalid"
  | "salaryIncomplete"
  | "salaryRange";

export type JobFormErrors = Partial<
  Record<"company" | "position" | "link" | "salary", JobFormError>
>;

type ValidationResult =
  | { input: JobInput; errors?: never }
  | { input?: never; errors: JobFormErrors };

export function toFormValues(job?: Job): JobFormValues {
  return {
    link: job?.link ?? "",
    description: job?.description ?? "",
    summary: job?.summary ?? "",
    company: job?.company ?? "",
    position: job?.position ?? "",
    salaryCurrency: job?.salary?.currency ?? null,
    salaryMin: job?.salary?.min ?? null,
    salaryMax: job?.salary?.max ?? null,
    salaryPeriod: job?.salary?.period ?? null,
    locations: job?.locations ?? [],
    workModel: job?.workModel ?? null,
    employmentType: job?.employmentType ?? null,
    applicationDeadline: job?.applicationDeadline ?? "",
  };
}

function parseLink(value: string) {
  const link = value.trim();
  if (!link) return null;

  if (/\s/.test(link)) return undefined;

  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(link) ? link : `https://${link}`;
  try {
    const url = new URL(withProtocol);
    const isWebLink = ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
    return isWebLink ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function parseSalary(values: JobFormValues): Salary | null | JobFormError {
  const { salaryCurrency: currency, salaryPeriod: period, salaryMin, salaryMax } = values;
  if (currency === null && period === null && salaryMin === null && salaryMax === null) {
    return null;
  }

  const min = salaryMin ?? salaryMax;
  const max = salaryMax ?? salaryMin;
  if (currency === null || period === null || min === null || max === null) {
    return "salaryIncomplete";
  }
  if (min > max) return "salaryRange";
  return { currency, period, min, max };
}

export function validateJobForm(values: JobFormValues): ValidationResult {
  const errors: JobFormErrors = {};
  const company = values.company.trim();
  const position = values.position.trim();
  const link = parseLink(values.link);
  const salary = parseSalary(values);

  if (!company) errors.company = "companyRequired";
  if (!position) errors.position = "positionRequired";
  if (link === undefined) errors.link = "linkInvalid";
  if (typeof salary === "string") errors.salary = salary;

  if (Object.keys(errors).length > 0 || typeof salary === "string") return { errors };

  return {
    input: {
      link: link ?? null,
      description: values.description,
      summary: values.summary,
      company,
      position,
      salary,
      locations: values.locations,
      workModel: values.workModel,
      employmentType: values.employmentType,
      applicationDeadline: values.applicationDeadline || null,
    },
  };
}
