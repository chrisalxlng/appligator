import { activityLimits, type ActivityInput } from "@appligator/shared";
import type { Database } from "../db/database.ts";
import { activities } from "../db/schema.ts";
import { updateApplicationStatus } from "./applicationStatus.ts";
import { fillEmptyDetails } from "./detailFills.ts";

type ActivityRow = typeof activities.$inferSelect;

export const maxActivityBodyBytes = activityLimits.attachments * activityLimits.emailBodyLength * 2;

export function toActivityColumns({ occurredAt, appointmentAt, ...input }: ActivityInput) {
  return {
    ...input,
    occurredAt: new Date(occurredAt),
    appointmentAt: appointmentAt === null ? null : new Date(appointmentAt),
  };
}

export async function insertActivity(
  tx: Database,
  applicationId: string,
  input: ActivityInput,
  { automatic = false } = {},
) {
  const [inserted] = await tx
    .insert(activities)
    .values({ ...toActivityColumns(input), applicationId, automatic })
    .returning();
  if (input.terms) await fillEmptyDetails(tx, applicationId, input.terms);
  await updateApplicationStatus(tx, applicationId);
  return inserted!;
}

export function toActivity({
  applicationId: _applicationId,
  occurredAt,
  appointmentAt,
  createdAt,
  updatedAt,
  ...row
}: ActivityRow) {
  return {
    ...row,
    occurredAt: occurredAt.toISOString(),
    appointmentAt: appointmentAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
