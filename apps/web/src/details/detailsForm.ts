import {
  jobLimits,
  maxNoticePeriod,
  type CompanyType,
  type ContractTerm,
  type ContractTermKind,
  type Currency,
  type EmploymentType,
  type JobDetails,
  type JobExtraction,
  type NoticePeriod,
  type NoticePeriodEnd,
  type NoticePeriodUnit,
  type Salary,
  type SalaryPeriod,
  type WorkingHoursPeriod,
  type WorkModel,
} from "@appligator/shared";

export interface DetailsFormValues {
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
}

export type FieldError =
  | "companyRequired"
  | "positionRequired"
  | "tooLong"
  | "linkInvalid"
  | "dateRequired"
  | "salaryIncomplete"
  | "salaryRange"
  | "salaryTooHigh"
  | "contractTermMonthsRequired"
  | "contractTermDateRequired"
  | "noticePeriodTooLong"
  | "vacationDaysNotHalf";

export type DetailsFormErrors = Partial<
  Record<"salary" | "contractTerm" | "noticePeriod" | "vacationDays" | "notes", FieldError>
>;

type DetailsResult =
  | { details: JobDetails; errors?: never }
  | { details?: never; errors: DetailsFormErrors };

export function toDetailsFormValues(details?: JobDetails): DetailsFormValues {
  return {
    companyType: details?.companyType ?? null,
    employeeCount: details?.employeeCount ?? null,
    salaryCurrency: details?.salary?.currency ?? null,
    salaryMin: details?.salary?.min ?? null,
    salaryMax: details?.salary?.max ?? null,
    salaryPeriod: details?.salary?.period ?? null,
    bonuses: details?.bonuses ?? [],
    benefits: details?.benefits ?? [],
    employmentType: details?.employmentType ?? null,
    workModel: details?.workModel ?? null,
    homeOfficePercentage: details?.homeOfficePercentage ?? null,
    workingHours: details?.workingHours?.hours ?? null,
    workingHoursPeriod: details?.workingHours?.period ?? "week",
    locations: details?.locations ?? [],
    commuteDistance: details?.commuteDistance ?? null,
    commuteDuration: details?.commuteDuration ?? null,
    vacationDays: details?.vacationDays ?? null,
    startDate: details?.startDate ?? "",
    ...contractTermValues(details?.contractTerm ?? null),
    probationMonths: details?.probationMonths ?? null,
    ...noticePeriodValues(details?.noticePeriod ?? null),
    notes: details?.notes ?? "",
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

function parseSalary(values: DetailsFormValues): Salary | null | FieldError {
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

function parseContractTerm(values: DetailsFormValues): ContractTerm | null | FieldError {
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

function parseNoticePeriod(values: DetailsFormValues): NoticePeriod | null | FieldError {
  const { noticePeriodAmount: amount, noticePeriodUnit: unit, noticePeriodEndOf: endOf } = values;
  if (amount === null) return null;
  return amount > maxNoticePeriod(unit) ? "noticePeriodTooLong" : { amount, unit, endOf };
}

function isHalfStep(value: number | null) {
  return value === null || Number.isInteger(value * 2);
}

function isError(result: object | null | FieldError) {
  return typeof result === "string";
}

export function requiredTextError(text: string, missingError: FieldError) {
  if (!text) return missingError;
  return text.length > jobLimits.textLength ? "tooLong" : undefined;
}

export function richTextError(html: string, maxLength: number): FieldError | undefined {
  return html.length > maxLength ? "tooLong" : undefined;
}

export function parseDetailsForm(values: DetailsFormValues): DetailsResult {
  const salary = parseSalary(values);
  const contractTerm = parseContractTerm(values);
  const noticePeriod = parseNoticePeriod(values);

  const errors: DetailsFormErrors = {
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
    details: {
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
    },
  };
}

export type ExtractedField = keyof JobExtraction;

export interface FieldFiller<Values> {
  isEmpty: (values: Values) => boolean;
  fill: (extraction: JobExtraction) => Partial<Values> | null;
}

type ExtractedDetail = Exclude<
  ExtractedField,
  "summary" | "company" | "position" | "applicationDeadline"
>;

export const detailFillers: Record<ExtractedDetail, FieldFiller<DetailsFormValues>> = {
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
};

export function fillEmptyFields<Values>(
  values: Values,
  extraction: JobExtraction,
  fillers: Partial<Record<ExtractedField, FieldFiller<Values>>>,
) {
  let filledValues = values;
  const filledFields: ExtractedField[] = [];

  for (const [field, filler] of Object.entries(fillers)) {
    const filled = filler.isEmpty(values) ? filler.fill(extraction) : null;
    if (!filled) continue;
    filledValues = { ...filledValues, ...filled };
    filledFields.push(field as ExtractedField);
  }

  return { values: filledValues, filledFields };
}
