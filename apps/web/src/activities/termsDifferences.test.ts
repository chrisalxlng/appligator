import { activityTermsSchema, applicationInputSchema } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { activityWith, jobFixture } from "../testing/fakeApi.ts";
import { collectDifferences } from "./termsDifferences.ts";

const details = applicationInputSchema.parse(jobFixture);
const sameTerms = activityTermsSchema.parse(jobFixture);
const emptyTerms = activityTermsSchema.parse({
  ...jobFixture,
  ...Object.fromEntries(Object.keys(sameTerms).map((field) => [field, null])),
  bonuses: [],
  benefits: [],
  locations: [],
});
const salary = { currency: "EUR" as const, period: "year" as const, min: 80_000, max: 80_000 };

test("finds no differences when the terms match the details", () => {
  expect(collectDifferences([activityWith({ terms: sameTerms })], details)).toEqual([]);
});

test("ignores terms and details that are not specified", () => {
  const interview = activityWith({ terms: { ...emptyTerms, startDate: "2027-03-01" } });

  expect(collectDifferences([interview], { ...details, startDate: null })).toEqual([]);
});

test("lists the changed fields in the order of the details with their activity", () => {
  const offer = activityWith({
    terms: { ...emptyTerms, vacationDays: 28, salary, position: "Staff Engineer" },
  });

  expect(collectDifferences([offer], details)).toEqual([
    { key: "position", changes: { position: "Staff Engineer" }, activity: offer },
    { key: "salary", changes: { salary }, activity: offer },
    { key: "vacationDays", changes: { vacationDays: 28 }, activity: offer },
  ]);
});

test("collects the differences of several activities", () => {
  const offer = activityWith({ terms: { ...emptyTerms, salary } });
  const interview = activityWith({ terms: { ...emptyTerms, vacationDays: 28 } });

  expect(collectDifferences([offer, interview], details)).toEqual([
    { key: "salary", changes: { salary }, activity: offer },
    { key: "vacationDays", changes: { vacationDays: 28 }, activity: interview },
  ]);
});

test("only takes the latest activity that specifies a field into account", () => {
  const offer = activityWith({ terms: { ...emptyTerms, vacationDays: 30 }, detailsReviewed: true });
  const interview = activityWith({ terms: { ...emptyTerms, vacationDays: 28 } });

  expect(collectDifferences([offer, interview], details)).toEqual([]);
});

test("takes over fields shown together only where they differ", () => {
  const interview = activityWith({ terms: { ...sameTerms, employeeCount: 500 } });

  expect(collectDifferences([interview], details)).toEqual([
    { key: "companySize", changes: { employeeCount: 500 }, activity: interview },
  ]);
});
