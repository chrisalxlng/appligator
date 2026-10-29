import { z } from "zod";
import { jobInputSchema } from "./job.ts";

export const maxJobPageLength = 10_000_000;

export const jobImportInputSchema = z.object({
  link: jobInputSchema.shape.link.unwrap(),
  html: z.string().trim().min(1).max(maxJobPageLength),
});

export type JobImportInput = z.infer<typeof jobImportInputSchema>;
