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

export const jobLimits = {
  textLength: 200,
  descriptionLength: 100_000,
  summaryLength: 10_000,
  locations: 50,
  salary: 100_000_000,
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
  locations: z.array(requiredText).max(jobLimits.locations),
  workModel: z.enum(workModels).nullable(),
  employmentType: z.enum(employmentTypes).nullable(),
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
export type Salary = z.infer<typeof salarySchema>;
export type JobInput = z.infer<typeof jobInputSchema>;
export type Job = z.infer<typeof jobSchema>;
export type JobListItem = z.infer<typeof jobListItemSchema>;
export type JobListPage = z.infer<typeof jobListPageSchema>;
