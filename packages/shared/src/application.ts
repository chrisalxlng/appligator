import { z } from "zod";
import { activityInputSchema } from "./activity.ts";
import { jobDetailsSchema, jobListItemSchema, requiredText } from "./job.ts";
import { applicationStatuses } from "./status.ts";

export const applicationInputSchema = z.object({
  company: requiredText,
  position: requiredText,
  ...jobDetailsSchema.shape,
});

export const applicationCreateSchema = z.object({
  jobId: z.uuid(),
  activity: activityInputSchema,
});

export const applicationSchema = applicationInputSchema.extend({
  id: z.uuid(),
  status: z.enum(applicationStatuses),
  appliedAt: z.iso.datetime().nullable(),
  pinned: z.boolean(),
  job: jobListItemSchema.pick({ id: true, position: true }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const applicationListItemSchema = applicationSchema.pick({
  id: true,
  company: true,
  position: true,
  status: true,
  pinned: true,
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
