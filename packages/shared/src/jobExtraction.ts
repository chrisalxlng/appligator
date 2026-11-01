import { z } from "zod";
import { jobInputSchema, jobLimits } from "./job.ts";

export const jobExtractionInputSchema = z.object({
  description: jobInputSchema.shape.description.trim().min(1),
});

const optionalText = z.string().max(jobLimits.textLength).nullable();

export const jobExtractionSchema = jobInputSchema
  .omit({ link: true, description: true, commuteDistance: true, commuteDuration: true })
  .extend({ company: optionalText, position: optionalText });

export type JobExtractionInput = z.infer<typeof jobExtractionInputSchema>;
export type JobExtraction = z.infer<typeof jobExtractionSchema>;
