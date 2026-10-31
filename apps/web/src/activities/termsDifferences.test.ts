import { activityTermsSchema, applicationInputSchema } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { jobFixture } from "../testing/fakeApi.ts";
import { termsDifferences } from "./termsDifferences.ts";

const details = applicationInputSchema.parse(jobFixture);
const sameTerms = activityTermsSchema.parse(jobFixture);

test("finds no differences when the terms match the details", () => {
  expect(termsDifferences(sameTerms, details)).toEqual([]);
});

test("ignores terms that are not specified", () => {
  const terms = { ...sameTerms, salary: null, benefits: [], position: null };

  expect(termsDifferences(terms, details)).toEqual([]);
});

test("ignores details that are not specified", () => {
  const terms = { ...sameTerms, startDate: "2027-03-01" };

  expect(termsDifferences(terms, { ...details, startDate: null })).toEqual([]);
});

test("lists the changed fields in the order of the details", () => {
  const salary = { currency: "EUR" as const, period: "year" as const, min: 80_000, max: 80_000 };
  const terms = { ...sameTerms, vacationDays: 28, salary, position: "Staff Engineer" };

  expect(termsDifferences(terms, details)).toEqual([
    { key: "position", changes: { position: "Staff Engineer" } },
    { key: "salary", changes: { salary } },
    { key: "vacationDays", changes: { vacationDays: 28 } },
  ]);
});

test("takes over fields shown together only where they differ", () => {
  const terms = { ...sameTerms, employeeCount: 500 };

  expect(termsDifferences(terms, details)).toEqual([
    { key: "companySize", changes: { employeeCount: 500 } },
  ]);
});
