import { z } from "zod";

export const currencies = ["EUR", "USD", "CHF", "GBP"] as const;
export const salaryPeriods = ["year", "month", "hour"] as const;
export const workModels = ["onSite", "hybrid", "remote"] as const;
export const employmentTypes = [
  "fullTime",
  "partTime",
  "workingStudent",
  "internship",
  "freelance",
] as const;
export const workingHoursPeriods = ["week", "month"] as const;
export const contractTermKinds = ["permanent", "months", "until"] as const;
export const noticePeriodUnits = ["weeks", "months"] as const;
export const noticePeriodEnds = ["month", "quarter"] as const;

export const jobLimits = {
  textLength: 200,
  descriptionLength: 100_000,
  summaryLength: 10_000,
  notesLength: 10_000,
  listItems: 50,
  salary: 100_000_000,
  workingHours: 1_000,
  commuteDistance: 10_000,
  commuteDuration: 10_000,
  vacationDays: 366,
  months: 1_200,
  weeks: 520,
};

const requiredText = z.string().trim().min(1).max(jobLimits.textLength);
const salaryAmount = z.int().min(0).max(jobLimits.salary);

const salarySchema = z
  .object({
    currency: z.enum(currencies),
    period: z.enum(salaryPeriods),
    min: salaryAmount,
    max: salaryAmount,
  })
  .refine(({ min, max }) => min <= max, {
    message: "The minimum salary must not exceed the maximum",
    path: ["max"],
  });

const workingHoursSchema = z.object({
  hours: z.number().positive().max(jobLimits.workingHours),
  period: z.enum(workingHoursPeriods),
});

const contractTermSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("permanent") }),
  z.object({ kind: z.literal("months"), months: z.int().min(1).max(jobLimits.months) }),
  z.object({ kind: z.literal("until"), date: z.iso.date() }),
]);

export function maxNoticePeriod(unit: NoticePeriodUnit) {
  return unit === "weeks" ? jobLimits.weeks : jobLimits.months;
}

const noticePeriodSchema = z
  .object({
    amount: z.int().min(1),
    unit: z.enum(noticePeriodUnits),
    endOf: z.enum(noticePeriodEnds).nullable(),
  })
  .refine(({ amount, unit }) => amount <= maxNoticePeriod(unit), {
    message: "The notice period is too long",
    path: ["amount"],
  });

const textList = z.array(requiredText).max(jobLimits.listItems);

export const jobInputSchema = z.object({
  link: z
    .url({ protocol: /^https?$/ })
    .max(2_000)
    .nullable(),
  description: z.string().max(jobLimits.descriptionLength),
  summary: z.string().max(jobLimits.summaryLength),
  company: requiredText,
  position: requiredText,
  salary: salarySchema.nullable(),
  bonuses: textList,
  benefits: textList,
  employmentType: z.enum(employmentTypes).nullable(),
  workModel: z.enum(workModels).nullable(),
  homeOfficePercentage: z.int().min(0).max(100).nullable(),
  workingHours: workingHoursSchema.nullable(),
  locations: textList,
  commuteDistance: z.int().min(0).max(jobLimits.commuteDistance).nullable(),
  commuteDuration: z.int().min(0).max(jobLimits.commuteDuration).nullable(),
  vacationDays: z.number().min(0).max(jobLimits.vacationDays).multipleOf(0.5).nullable(),
  startDate: z.iso.date().nullable(),
  contractTerm: contractTermSchema.nullable(),
  probationMonths: z.int().min(0).max(jobLimits.months).nullable(),
  noticePeriod: noticePeriodSchema.nullable(),
  notes: z.string().max(jobLimits.notesLength),
  applicationDeadline: z.iso.date().nullable(),
});

export const jobSchema = jobInputSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const jobListItemSchema = jobSchema.pick({
  id: true,
  company: true,
  position: true,
  createdAt: true,
});

export const jobListPageSchema = z.object({
  items: z.array(jobListItemSchema),
  nextCursor: z.string().nullable(),
});

export type Currency = (typeof currencies)[number];
export type SalaryPeriod = (typeof salaryPeriods)[number];
export type WorkModel = (typeof workModels)[number];
export type EmploymentType = (typeof employmentTypes)[number];
export type WorkingHoursPeriod = (typeof workingHoursPeriods)[number];
export type NoticePeriodUnit = (typeof noticePeriodUnits)[number];
export type NoticePeriodEnd = (typeof noticePeriodEnds)[number];
export type Salary = z.infer<typeof salarySchema>;
export type WorkingHours = z.infer<typeof workingHoursSchema>;
export type ContractTerm = z.infer<typeof contractTermSchema>;
export type ContractTermKind = ContractTerm["kind"];
export type NoticePeriod = z.infer<typeof noticePeriodSchema>;
export type JobInput = z.infer<typeof jobInputSchema>;
export type Job = z.infer<typeof jobSchema>;
export type JobListItem = z.infer<typeof jobListItemSchema>;
export type JobListPage = z.infer<typeof jobListPageSchema>;
