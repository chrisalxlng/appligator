import { applicationStatusOf } from "@appligator/shared";
import { desc, eq } from "drizzle-orm";
import type { Database } from "../db/database.ts";
import { activities, applications } from "../db/schema.ts";

export async function updateApplicationStatus(db: Database, applicationId: string) {
  const rows = await db
    .select({ type: activities.type })
    .from(activities)
    .where(eq(activities.applicationId, applicationId))
    .orderBy(desc(activities.occurredAt), desc(activities.createdAt));

  await db
    .update(applications)
    .set({ status: applicationStatusOf(rows.map(({ type }) => type)) })
    .where(eq(applications.id, applicationId));
}
