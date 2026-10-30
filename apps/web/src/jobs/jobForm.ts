import {
  jobLimits,
  maxNoticePeriod,
  type CompanyType,
  type ContractTerm,
  type ContractTermKind,
  type Currency,
  type EmploymentType,
  type Job,
  type JobExtraction,
  type JobInput,
  type NoticePeriod,
  type NoticePeriodEnd,
  type NoticePeriodUnit,
  type Salary,
  type SalaryPeriod,
  type WorkingHoursPeriod,
  type WorkModel,
} from "@appligator/shared";

export interface JobFormValues {
  link: string;
  description: string;
  summary: string;
  company: string;
  position: string;
  companyType: CompanyType | null;
  employeeCount: number | null;
  salaryCurrency: Currency | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  bonuses: string[];
  benefits: string[];
  employmentType: EmploymentType | null;
  workModel: WorkModel | null;
  homeOfficePercentage: number | null;
  workingHours: number | null;
  workingHoursPeriod: WorkingHoursPeriod;
  locations: string[];
  commuteDistance: number | null;
  commuteDuration: number | null;
  vacationDays: number | null;
  startDate: string;
  contractTermKind: ContractTermKind | null;
  contractTermMonths: number | null;
  contractTermDate: string;
  probationMonths: number | null;
  noticePeriodAmount: number | null;
  noticePeriodUnit: NoticePeriodUnit;
  noticePeriodEndOf: NoticePeriodEnd | null;
  notes: string;
  applicationDeadline: string;
}

export type JobFormError =
  | "companyRequired"
  | "positionRequired"
  | "tooLong"
  | "linkInvalid"
  | "salaryIncomplete"
  | "salaryRange"
  | "salaryTooHigh"
  | "contractTermMonthsRequired"
  | "contractTermDateRequired"
  | "noticePeriodTooLong"
  | "vacationDaysNotHalf";

export type JobFormErrors = Partial<
  Record<
    | "description"
    | "summary"
    | "company"
    | "position"
    | "link"
    | "salary"
    | "contractTerm"
    | "noticePeriod"
    | "vacationDays"
    | "notes",
    JobFormError
  >
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
    companyType: job?.companyType ?? null,
    employeeCount: job?.employeeCount ?? null,
    salaryCurrency: job?.salary?.currency ?? null,
    salaryMin: job?.salary?.min ?? null,
    salaryMax: job?.salary?.max ?? null,
    salaryPeriod: job?.salary?.period ?? null,
    bonuses: job?.bonuses ?? [],
    benefits: job?.benefits ?? [],
    employmentType: job?.employmentType ?? null,
    workModel: job?.workModel ?? null,
    homeOfficePercentage: job?.homeOfficePercentage ?? null,
    workingHours: job?.workingHours?.hours ?? null,
    workingHoursPeriod: job?.workingHours?.period ?? "week",
    locations: job?.locations ?? [],
    commuteDistance: job?.commuteDistance ?? null,
    commuteDuration: job?.commuteDuration ?? null,
    vacationDays: job?.vacationDays ?? null,
    startDate: job?.startDate ?? "",
    ...contractTermValues(job?.contractTerm ?? null),
    probationMonths: job?.probationMonths ?? null,
    ...noticePeriodValues(job?.noticePeriod ?? null),
    notes: job?.notes ?? "",
    applicationDeadline: job?.applicationDeadline ?? "",
  };
}

function contractTermValues(contractTerm: ContractTerm | null) {
  return {
    contractTermKind: contractTerm?.kind ?? null,
    contractTermMonths: contractTerm?.kind === "months" ? contractTerm.months : null,
    contractTermDate: contractTerm?.kind === "until" ? contractTerm.date : "",
  };
}

function noticePeriodValues(noticePeriod: NoticePeriod | null) {
  return {
    noticePeriodAmount: noticePeriod?.amount ?? null,
    noticePeriodUnit: noticePeriod?.unit ?? ("months" as const),
    noticePeriodEndOf: noticePeriod?.endOf ?? null,
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
  if (max > jobLimits.salary) return "salaryTooHigh";
  return { currency, period, min, max };
}

function parseContractTerm(values: JobFormValues): ContractTerm | null | JobFormError {
  const { contractTermKind: kind, contractTermMonths: months, contractTermDate: date } = values;
  switch (kind) {
    case "permanent":
      return { kind };
    case "months":
      return months === null ? "contractTermMonthsRequired" : { kind, months };
    case "until":
      return date ? { kind, date } : "contractTermDateRequired";
    case null:
      return null;
  }
}

function parseNoticePeriod(values: JobFormValues): NoticePeriod | null | JobFormError {
  const { noticePeriodAmount: amount, noticePeriodUnit: unit, noticePeriodEndOf: endOf } = values;
  if (amount === null) return null;
  return amount > maxNoticePeriod(unit) ? "noticePeriodTooLong" : { amount, unit, endOf };
}

function isHalfStep(value: number | null) {
  return value === null || Number.isInteger(value * 2);
}

function isError(result: object | null | JobFormError) {
  return typeof result === "string";
}

function requiredTextError(text: string, missingError: JobFormError) {
  if (!text) return missingError;
  return text.length > jobLimits.textLength ? "tooLong" : undefined;
}

function richTextError(html: string, maxLength: number) {
  return html.length > maxLength ? "tooLong" : undefined;
}

export function validateJobForm(values: JobFormValues): ValidationResult {
  const company = values.company.trim();
  const position = values.position.trim();
  const link = parseLink(values.link);
  const salary = parseSalary(values);
  const contractTerm = parseContractTerm(values);
  const noticePeriod = parseNoticePeriod(values);

  const errors: JobFormErrors = {
    description: richTextError(values.description, jobLimits.descriptionLength),
    summary: richTextError(values.summary, jobLimits.summaryLength),
    company: requiredTextError(company, "companyRequired"),
    position: requiredTextError(position, "positionRequired"),
    link: link === undefined ? "linkInvalid" : undefined,
    salary: isError(salary) ? salary : undefined,
    contractTerm: isError(contractTerm) ? contractTerm : undefined,
    noticePeriod: isError(noticePeriod) ? noticePeriod : undefined,
    vacationDays: isHalfStep(values.vacationDays) ? undefined : "vacationDaysNotHalf",
    notes: richTextError(values.notes, jobLimits.notesLength),
  };

  if (
    Object.values(errors).some(Boolean) ||
    isError(salary) ||
    isError(contractTerm) ||
    isError(noticePeriod)
  ) {
    return { errors };
  }

  return {
    input: {
      link: link ?? null,
      description: values.description,
      summary: values.summary,
      company,
      position,
      companyType: values.companyType,
      employeeCount: values.employeeCount,
      salary,
      bonuses: values.bonuses,
      benefits: values.benefits,
      employmentType: values.employmentType,
      workModel: values.workModel,
      homeOfficePercentage: values.homeOfficePercentage,
      workingHours:
        values.workingHours === null
          ? null
          : { hours: values.workingHours, period: values.workingHoursPeriod },
      locations: values.locations,
      commuteDistance: values.commuteDistance,
      commuteDuration: values.commuteDuration,
      vacationDays: values.vacationDays,
      startDate: values.startDate || null,
      contractTerm,
      probationMonths: values.probationMonths,
      noticePeriod,
      notes: values.notes,
      applicationDeadline: values.applicationDeadline || null,
    },
  };
}

export type ExtractedField = keyof JobExtraction;

interface FieldFiller {
  isEmpty: (values: JobFormValues) => boolean;
  fill: (extraction: JobExtraction) => Partial<JobFormValues> | null;
}

const fieldFillers: Record<ExtractedField, FieldFiller> = {
  summary: {
    isEmpty: (values) => !values.summary,
    fill: ({ summary }) => (summary ? { summary } : null),
  },
  company: {
    isEmpty: (values) => !values.company.trim(),
    fill: ({ company }) => (company ? { company } : null),
  },
  position: {
    isEmpty: (values) => !values.position.trim(),
    fill: ({ position }) => (position ? { position } : null),
  },
  companyType: {
    isEmpty: (values) => values.companyType === null,
    fill: ({ companyType }) => companyType && { companyType },
  },
  employeeCount: {
    isEmpty: (values) => values.employeeCount === null,
    fill: ({ employeeCount }) => (employeeCount === null ? null : { employeeCount }),
  },
  salary: {
    isEmpty: ({ salaryCurrency, salaryPeriod, salaryMin, salaryMax }) =>
      [salaryCurrency, salaryPeriod, salaryMin, salaryMax].every((value) => value === null),
    fill: ({ salary }) =>
      salary && {
        salaryCurrency: salary.currency,
        salaryPeriod: salary.period,
        salaryMin: salary.min,
        salaryMax: salary.max,
      },
  },
  bonuses: {
    isEmpty: (values) => values.bonuses.length === 0,
    fill: ({ bonuses }) => (bonuses.length > 0 ? { bonuses } : null),
  },
  benefits: {
    isEmpty: (values) => values.benefits.length === 0,
    fill: ({ benefits }) => (benefits.length > 0 ? { benefits } : null),
  },
  employmentType: {
    isEmpty: (values) => values.employmentType === null,
    fill: ({ employmentType }) => employmentType && { employmentType },
  },
  workModel: {
    isEmpty: (values) => values.workModel === null,
    fill: ({ workModel }) => workModel && { workModel },
  },
  homeOfficePercentage: {
    isEmpty: (values) => values.homeOfficePercentage === null,
    fill: ({ homeOfficePercentage }) =>
      homeOfficePercentage === null ? null : { homeOfficePercentage },
  },
  workingHours: {
    isEmpty: (values) => values.workingHours === null,
    fill: ({ workingHours }) =>
      workingHours && { workingHours: workingHours.hours, workingHoursPeriod: workingHours.period },
  },
  locations: {
    isEmpty: (values) => values.locations.length === 0,
    fill: ({ locations }) => (locations.length > 0 ? { locations } : null),
  },
  vacationDays: {
    isEmpty: (values) => values.vacationDays === null,
    fill: ({ vacationDays }) => (vacationDays === null ? null : { vacationDays }),
  },
  startDate: {
    isEmpty: (values) => !values.startDate,
    fill: ({ startDate }) => (startDate ? { startDate } : null),
  },
  contractTerm: {
    isEmpty: (values) => values.contractTermKind === null,
    fill: ({ contractTerm }) => contractTerm && contractTermValues(contractTerm),
  },
  probationMonths: {
    isEmpty: (values) => values.probationMonths === null,
    fill: ({ probationMonths }) => (probationMonths === null ? null : { probationMonths }),
  },
  noticePeriod: {
    isEmpty: (values) => values.noticePeriodAmount === null,
    fill: ({ noticePeriod }) => noticePeriod && noticePeriodValues(noticePeriod),
  },
  notes: {
    isEmpty: (values) => !values.notes,
    fill: ({ notes }) => (notes ? { notes } : null),
  },
  applicationDeadline: {
    isEmpty: (values) => !values.applicationDeadline,
    fill: ({ applicationDeadline }) => (applicationDeadline ? { applicationDeadline } : null),
  },
};

export function fillEmptyFields(values: JobFormValues, extraction: JobExtraction) {
  let filledValues = values;
  const filledFields: ExtractedField[] = [];

  for (const [field, { isEmpty, fill }] of Object.entries(fieldFillers)) {
    const filled = isEmpty(values) ? fill(extraction) : null;
    if (!filled) continue;
    filledValues = { ...filledValues, ...filled };
    filledFields.push(field as ExtractedField);
  }

  return { values: filledValues, filledFields };
}
