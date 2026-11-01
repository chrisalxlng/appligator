import { z } from "zod";

export const jobStatuses = ["open", "applied"] as const;
export const applicationStatuses = [
  "applied",
  "interviewing",
  "offer",
  "accepted",
  "declined",
  "rejected",
  "withdrawn",
  "paused",
] as const;

function statusCountsSchema<const Statuses extends readonly [string, ...string[]]>(
  statuses: Statuses,
) {
  return z.array(z.object({ status: z.enum(statuses), count: z.int().min(1) }));
}

export const jobStatusCountsSchema = statusCountsSchema(jobStatuses);
export const applicationStatusCountsSchema = statusCountsSchema(applicationStatuses);

export const pinInputSchema = z.object({ pinned: z.boolean() });

export type PinInput = z.infer<typeof pinInputSchema>;
export type JobStatus = (typeof jobStatuses)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type StatusCount<Status extends string> = { status: Status; count: number };
