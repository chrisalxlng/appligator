import { isDeepStrictEqual } from "node:util";
import { activityTermsSchema, isSpecifiedDetail, type ActivityTerms } from "@appligator/shared";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { Database } from "../db/database.ts";
import { activities, applications } from "../db/schema.ts";
import { fromSalaryColumns, toSalaryColumns } from "./salaryColumns.ts";

type TermsField = keyof ActivityTerms;

const termsFields = Object.keys(activityTermsSchema.shape) as TermsField[];

// Only new values count, so saving an activity again does not restore details cleared by hand.
export async function fillEmptyDetails(
  db: Database,
  applicationId: string,
  terms: ActivityTerms,
  previousTerms: ActivityTerms | null = null,
) {
  const [row] = await db.select().from(applications).where(eq(applications.id, applicationId));
  const details: Record<string, unknown> = fromSalaryColumns(row!);
  const { position: _position, ...detailTerms } = terms;
  const fills = Object.fromEntries(
    Object.entries(detailTerms).filter(
      ([field, value]) =>
        isSpecifiedDetail(value) &&
        !isSpecifiedDetail(details[field]) &&
        !isDeepStrictEqual(value, previousTerms?.[field as TermsField]),
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

// A detail changed by hand is the decision of the user, so older terms no longer offer to replace it.
export async function reviewTermsOfChangedDetails(
  db: Database,
  applicationId: string,
  previous: Record<TermsField, unknown>,
  next: Record<TermsField, unknown>,
) {
  const changedFields = termsFields.filter(
    (field) => !isDeepStrictEqual(previous[field], next[field]),
  );
  const unreviewed = await db
    .select({ id: activities.id, terms: activities.terms })
    .from(activities)
    .where(
      and(
        eq(activities.applicationId, applicationId),
        eq(activities.detailsReviewed, false),
        isNotNull(activities.terms),
      ),
    );
  const reviewedIds = unreviewed
    .filter(({ terms }) => changedFields.some((field) => isSpecifiedDetail(terms![field])))
    .map(({ id }) => id);
  if (reviewedIds.length === 0) return;

  await db
    .update(activities)
    .set({ detailsReviewed: true })
    .where(inArray(activities.id, reviewedIds));
}
