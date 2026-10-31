import type { ActivityTerms, ApplicationInput } from "@appligator/shared";

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
}

function isSpecified(value: unknown) {
  return value !== null && !(Array.isArray(value) && value.length === 0);
}

function isEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function termsDifferences(terms: ActivityTerms, details: ApplicationInput) {
  return termsGroups.flatMap(({ key, fields }): TermsDifference[] => {
    const changed = fields.filter(
      (field) => isSpecified(terms[field]) && !isEqual(terms[field], details[field]),
    );
    if (changed.length === 0) return [];
    return [{ key, changes: Object.fromEntries(changed.map((field) => [field, terms[field]])) }];
  });
}
