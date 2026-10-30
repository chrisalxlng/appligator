import { z } from "zod";
import { jobInputSchema, jobLimits } from "./job.ts";

const { description, ...jobFields } = jobInputSchema.shape;

export const jobExtractionInputSchema = z.object({ description: description.trim().min(1) });

export const jobExtractionSchema = z.object({
  summary: jobFields.summary,
  company: z.string().max(jobLimits.textLength).nullable(),
  position: z.string().max(jobLimits.textLength).nullable(),
  salary: jobFields.salary,
  bonuses: jobFields.bonuses,
  benefits: jobFields.benefits,
  employmentType: jobFields.employmentType,
  workModel: jobFields.workModel,
  homeOfficePercentage: jobFields.homeOfficePercentage,
  workingHours: jobFields.workingHours,
  locations: jobFields.locations,
  vacationDays: jobFields.vacationDays,
  startDate: jobFields.startDate,
  contractTerm: jobFields.contractTerm,
  probationMonths: jobFields.probationMonths,
  noticePeriod: jobFields.noticePeriod,
  notes: jobFields.notes,
  applicationDeadline: jobFields.applicationDeadline,
});

export type JobExtractionInput = z.infer<typeof jobExtractionInputSchema>;
export type JobExtraction = z.infer<typeof jobExtractionSchema>;
