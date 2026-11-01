import { isSpecifiedDetail, type ActivityTerms } from "@appligator/shared";
import { eq } from "drizzle-orm";
import type { Database } from "../db/database.ts";
import { applications } from "../db/schema.ts";
import { fromSalaryColumns, toSalaryColumns } from "./salaryColumns.ts";

/** Takes over the terms of an activity into the details of its application that are still empty. */
export async function fillEmptyDetails(db: Database, applicationId: string, terms: ActivityTerms) {
  const [row] = await db.select().from(applications).where(eq(applications.id, applicationId));
  const details: Record<string, unknown> = fromSalaryColumns(row!);
  const { position: _position, ...detailTerms } = terms;
  const fills = Object.fromEntries(
    Object.entries(detailTerms).filter(
      ([field, value]) => isSpecifiedDetail(value) && !isSpecifiedDetail(details[field]),
    ),
  );
  if (Object.keys(fills).length === 0) return;

  await db
    .update(applications)
    .set({
      ...("salary" in fills ? toSalaryColumns(fills as Pick<ActivityTerms, "salary">) : fills),
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));
}
