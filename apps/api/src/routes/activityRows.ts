import { activityLimits, type ActivityInput } from "@appligator/shared";
import type { activities } from "../db/schema.ts";

type ActivityRow = typeof activities.$inferSelect;

export const maxActivityBodyBytes = activityLimits.attachments * activityLimits.emailBodyLength * 2;

export function toActivityColumns({ occurredAt, appointmentAt, ...input }: ActivityInput) {
  return {
    ...input,
    occurredAt: new Date(occurredAt),
    appointmentAt: appointmentAt === null ? null : new Date(appointmentAt),
  };
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
