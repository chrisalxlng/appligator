import { z } from "zod";
import { jobDetailsSchema, jobListItemSchema, requiredText } from "./job.ts";
import { applicationStatuses } from "./status.ts";

export const applicationInputSchema = z.object({
  company: requiredText,
  position: requiredText,
  ...jobDetailsSchema.shape,
});

export const applicationCreateSchema = z.object({
  jobId: z.uuid(),
  appliedAt: z.iso.date(),
});

export const applicationSchema = applicationInputSchema.extend({
  id: z.uuid(),
  status: z.enum(applicationStatuses),
  appliedAt: z.iso.date(),
  favorite: z.boolean(),
  job: jobListItemSchema.pick({ id: true, position: true }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const applicationListItemSchema = applicationSchema.pick({
  id: true,
  company: true,
  position: true,
  status: true,
  favorite: true,
  createdAt: true,
});

export const applicationListPageSchema = z.object({
  items: z.array(applicationListItemSchema),
  nextCursor: z.string().nullable(),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;
export type ApplicationCreate = z.infer<typeof applicationCreateSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type ApplicationListItem = z.infer<typeof applicationListItemSchema>;
export type ApplicationListPage = z.infer<typeof applicationListPageSchema>;
