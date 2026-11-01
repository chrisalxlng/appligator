import {
  isSpecifiedDetail,
  type Activity,
  type ActivityTerms,
  type ApplicationInput,
} from "@appligator/shared";

type TermsField = keyof ActivityTerms;

// Fields shown together in the details are taken over together, under the key of their detail.
const termsGroups: { key: string; fields: TermsField[] }[] = [
  { key: "position", fields: ["position"] },
  { key: "companySize", fields: ["companyType", "employeeCount"] },
  { key: "salary", fields: ["salary"] },
  { key: "bonuses", fields: ["bonuses"] },
  { key: "benefits", fields: ["benefits"] },
  { key: "employmentType", fields: ["employmentType"] },
  { key: "workModel", fields: ["workModel"] },
  { key: "homeOfficePercentage", fields: ["homeOfficePercentage"] },
  { key: "workingHours", fields: ["workingHours"] },
  { key: "locations", fields: ["locations"] },
  { key: "commute", fields: ["commuteDistance", "commuteDuration"] },
  { key: "vacationDays", fields: ["vacationDays"] },
  { key: "startDate", fields: ["startDate"] },
  { key: "contractTerm", fields: ["contractTerm"] },
  { key: "probationMonths", fields: ["probationMonths"] },
  { key: "noticePeriod", fields: ["noticePeriod"] },
];

export interface TermsDifference {
  key: string;
  changes: Partial<ActivityTerms>;
  activity: Activity;
}

function isEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function specifies(activity: Activity, fields: TermsField[]) {
  return fields.some((field) => isSpecifiedDetail(activity.terms?.[field]));
}

/**
 * Collects the terms that would replace other values in the details; empty details take them over
 * anyway. Per field, only the latest activity that specifies it counts, and only until its terms
 * are reviewed.
 */
export function collectDifferences(activitiesLatestFirst: Activity[], details: ApplicationInput) {
  return termsGroups.flatMap(({ key, fields }): TermsDifference[] => {
    const activity = activitiesLatestFirst.find((candidate) => specifies(candidate, fields));
    if (!activity?.terms || activity.detailsReviewed) return [];

    const terms = activity.terms;
    const changed = fields.filter(
      (field) =>
        isSpecifiedDetail(terms[field]) &&
        isSpecifiedDetail(details[field]) &&
        !isEqual(terms[field], details[field]),
    );
    if (changed.length === 0) return [];
    return [
      {
        key,
        changes: Object.fromEntries(changed.map((field) => [field, terms[field]])),
        activity,
      },
    ];
  });
}
