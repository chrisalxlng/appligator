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

const requiredText = z.string().trim().min(1).max(200);
const salaryAmount = z.int().min(0).max(100_000_000);

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
  description: z.string().max(100_000),
  summary: z.string().max(10_000),
  company: requiredText,
  position: requiredText,
  salary: salarySchema.nullable(),
  locations: z.array(requiredText).max(50),
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

export type JobInput = z.infer<typeof jobInputSchema>;
export type Job = z.infer<typeof jobSchema>;
export type JobListItem = z.infer<typeof jobListItemSchema>;
