import { expect, test } from "vite-plus/test";
import { daysAgo, formatDeadline, formatSalaryRange, hostname } from "./formatJob.ts";

const now = new Date(2026, 9, 28, 9, 0);

test.each([
  ["earlier today", new Date(2026, 9, 28, 0, 5), 0],
  ["late yesterday", new Date(2026, 9, 27, 23, 55), 1],
  ["last week", new Date(2026, 9, 21, 12, 0), 7],
])("counts the days since a time %s", (_, date, days) => {
  expect(daysAgo(date.toISOString(), now)).toBe(days);
});

test("formats a salary range in the given locale", () => {
  const salary = { currency: "EUR", period: "year", min: 65_000, max: 75_000 } as const;

  expect(formatSalaryRange(salary, "de")).toBe("65.000 – 75.000\u00a0€");
  expect(formatSalaryRange(salary, "en")).toBe("€65,000 – €75,000");
});

test("formats a fixed salary as a single amount", () => {
  expect(formatSalaryRange({ currency: "USD", period: "hour", min: 40, max: 40 }, "en")).toBe(
    "$40",
  );
});

test("formats a deadline as a calendar date regardless of the time zone", () => {
  expect(formatDeadline("2026-12-31", "de")).toBe("31.12.2026");
});

test("shortens a link to its host name", () => {
  expect(hostname("https://www.stepstone.de/jobs/view/123")).toBe("stepstone.de");
});
