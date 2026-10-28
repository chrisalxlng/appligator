import { z } from "zod";
import { jobInputSchema } from "./job.ts";

const { description, summary, salary, locations, workModel, employmentType, applicationDeadline } =
  jobInputSchema.shape;

export const jobExtractionInputSchema = z.object({ description: description.trim().min(1) });

export const jobExtractionSchema = z.object({
  summary,
  company: z.string().max(200).nullable(),
  position: z.string().max(200).nullable(),
  salary,
  locations,
  workModel,
  employmentType,
  applicationDeadline,
});

export type JobExtractionInput = z.infer<typeof jobExtractionInputSchema>;
export type JobExtraction = z.infer<typeof jobExtractionSchema>;
