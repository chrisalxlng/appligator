import { z } from "zod";

export const jobStatuses = ["open", "applied"] as const;
export const applicationStatuses = ["applied"] as const;

function countsSchema<const Statuses extends readonly [string, ...string[]]>(statuses: Statuses) {
  return z.object({
    statuses: z.array(z.object({ status: z.enum(statuses), count: z.int().min(1) })),
    favorites: z.int().min(0),
  });
}

export const jobCountsSchema = countsSchema(jobStatuses);
export const applicationCountsSchema = countsSchema(applicationStatuses);
export const favoriteInputSchema = z.object({ favorite: z.boolean() });

export type JobStatus = (typeof jobStatuses)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type StatusCount<Status extends string> = { status: Status; count: number };
export type Counts<Status extends string> = { statuses: StatusCount<Status>[]; favorites: number };
export type FavoriteInput = z.infer<typeof favoriteInputSchema>;
