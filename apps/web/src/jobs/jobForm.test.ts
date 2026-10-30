import { jobInputSchema, jobLimits, type Job, type JobExtraction } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import {
  fillEmptyJobFields,
  toFormValues,
  validateJobForm,
  type JobFormValues,
} from "./jobForm.ts";

const job: Job = {
  id: "8f9c1a52-7d1e-4b8a-9a43-1c2d3e4f5a6b",
  link: "https://www.stepstone.de/jobs/view/123",
  description: "<p>Description</p>",
  summary: "<p>Summary</p>",
  company: "Randstad Digital Germany AG",
  position: "Lead Developer Frontend",
  companyType: "corporation",
  employeeCount: 60_000,
  salary: { currency: "EUR", period: "year", min: 65_000, max: 75_000 },
  bonuses: ["13. Monatsgehalt", "Erfolgsbeteiligung"],
  benefits: ["50 € Brutto-Netto-Auszahlung"],
  employmentType: "fullTime",
  workModel: "hybrid",
  homeOfficePercentage: 80,
  workingHours: { hours: 38.5, period: "week" },
  locations: ["Düsseldorf", "Hamburg"],
  commuteDistance: 17,
  commuteDuration: 25,
  vacationDays: 30,
  startDate: "2027-02-01",
  contractTerm: { kind: "permanent" },
  probationMonths: 3,
  noticePeriod: { amount: 4, unit: "weeks", endOf: "month" },
  notes: "<p>Training budget of €2,000 per year</p>",
  applicationDeadline: "2026-12-31",
  status: "open",
  application: null,
  createdAt: "2026-10-28T09:00:00.000Z",
  updatedAt: "2026-10-28T09:00:00.000Z",
};

function valuesWith(overrides: Partial<JobFormValues>): JobFormValues {
  return { ...toFormValues(), company: "Initech", position: "Developer", ...overrides };
}

test("turns the values of an existing job back into the same input", () => {
  const {
    id: _id,
    status: _status,
    application: _application,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...input
  } = job;

  expect(validateJobForm(toFormValues(job))).toEqual({ input });
});

test("creates a valid input from a form with only company and position", () => {
  const { input } = validateJobForm(valuesWith({ company: " Initech ", position: " Developer " }));

  expect(jobInputSchema.parse(input)).toEqual({
    link: null,
    description: "",
    summary: "",
    company: "Initech",
    position: "Developer",
    companyType: null,
    employeeCount: null,
    salary: null,
    bonuses: [],
    benefits: [],
    employmentType: null,
    workModel: null,
    homeOfficePercentage: null,
    workingHours: null,
    locations: [],
    commuteDistance: null,
    commuteDuration: null,
    vacationDays: null,
    startDate: null,
    contractTerm: null,
    probationMonths: null,
    noticePeriod: null,
    notes: "",
    applicationDeadline: null,
  });
});

test.each([
  ["a duration", { kind: "months", months: 24 }],
  ["an end date", { kind: "until", date: "2028-01-31" }],
] as const)("keeps a fixed-term contract with %s", (_, contractTerm) => {
  expect(validateJobForm(toFormValues({ ...job, contractTerm })).input?.contractTerm).toEqual(
    contractTerm,
  );
});

test.each([
  ["months", "contractTermMonthsRequired"],
  ["until", "contractTermDateRequired"],
] as const)("requires the details of a fixed-term contract by %s", (kind, error) => {
  expect(validateJobForm(valuesWith({ contractTermKind: kind })).errors).toEqual({
    contractTerm: error,
  });
});

test("ignores the period of working hours without hours", () => {
  const { input } = validateJobForm(valuesWith({ workingHoursPeriod: "month" }));

  expect(input?.workingHours).toBeNull();
});

test.each([
  [31.5, undefined],
  [31.3, { vacationDays: "vacationDaysNotHalf" }],
])("accepts only whole or half vacation days like %d", (vacationDays, errors) => {
  expect(validateJobForm(valuesWith({ vacationDays })).errors).toEqual(errors);
});

test("rejects a notice period longer than its unit allows", () => {
  const values = valuesWith({ noticePeriodAmount: jobLimits.weeks + 1, noticePeriodUnit: "weeks" });

  expect(validateJobForm(values).errors).toEqual({ noticePeriod: "noticePeriodTooLong" });
});

test("requires company and position", () => {
  expect(validateJobForm(toFormValues()).errors).toEqual({
    company: "companyRequired",
    position: "positionRequired",
  });
});

test("adds https to a link without a protocol", () => {
  const { input } = validateJobForm(valuesWith({ link: "stepstone.de/jobs/123" }));

  expect(input?.link).toBe("https://stepstone.de/jobs/123");
});

test.each(["javascript:alert(1)", "https://", "not a link", "stepstone"])(
  "rejects the link %s",
  (link) => {
    expect(validateJobForm(valuesWith({ link })).errors).toEqual({ link: "linkInvalid" });
  },
);

test("uses a single amount as minimum and maximum salary", () => {
  const { input } = validateJobForm(
    valuesWith({ salaryCurrency: "EUR", salaryPeriod: "hour", salaryMin: 40 }),
  );

  expect(input?.salary).toEqual({ currency: "EUR", period: "hour", min: 40, max: 40 });
});

test("requires currency and period once an amount is entered", () => {
  expect(validateJobForm(valuesWith({ salaryMin: 50_000 })).errors).toEqual({
    salary: "salaryIncomplete",
  });
});

test("rejects a minimum salary above the maximum", () => {
  const values = valuesWith({
    salaryCurrency: "EUR",
    salaryPeriod: "year",
    salaryMin: 80_000,
    salaryMax: 70_000,
  });

  expect(validateJobForm(values).errors).toEqual({ salary: "salaryRange" });
});

test("rejects texts longer than a job allows", () => {
  const values = valuesWith({
    company: "x".repeat(jobLimits.textLength + 1),
    position: "x".repeat(jobLimits.textLength + 1),
    description: "x".repeat(jobLimits.descriptionLength + 1),
    summary: "x".repeat(jobLimits.summaryLength + 1),
    notes: "x".repeat(jobLimits.notesLength + 1),
  });

  expect(validateJobForm(values).errors).toEqual({
    company: "tooLong",
    position: "tooLong",
    description: "tooLong",
    summary: "tooLong",
    notes: "tooLong",
  });
});

test("accepts texts up to the length a job allows", () => {
  const values = valuesWith({
    company: "x".repeat(jobLimits.textLength),
    description: "x".repeat(jobLimits.descriptionLength),
  });

  expect(validateJobForm(values).input).toBeDefined();
});

test("rejects a salary above the maximum a job allows", () => {
  const values = valuesWith({
    salaryCurrency: "EUR",
    salaryPeriod: "year",
    salaryMax: jobLimits.salary + 1,
  });

  expect(validateJobForm(values).errors).toEqual({ salary: "salaryTooHigh" });
});

const extraction: JobExtraction = {
  summary: "<p>Initech is hiring.</p>",
  company: "Initech GmbH",
  position: "Frontend Developer",
  companyType: "startup",
  employeeCount: 25,
  salary: { currency: "EUR", period: "year", min: 60_000, max: 70_000 },
  bonuses: ["13. Monatsgehalt"],
  benefits: ["Jobrad"],
  employmentType: "fullTime",
  workModel: "remote",
  homeOfficePercentage: 100,
  workingHours: { hours: 40, period: "week" },
  locations: ["München"],
  vacationDays: 30,
  startDate: "2027-01-01",
  contractTerm: { kind: "months", months: 24 },
  probationMonths: 6,
  noticePeriod: { amount: 3, unit: "months", endOf: "quarter" },
  notes: "<ul><li><p>Training budget</p></li></ul>",
  applicationDeadline: "2026-12-31",
};

test("fills all empty fields with the extracted job information", () => {
  const { values, filledFields } = fillEmptyJobFields(toFormValues(), extraction);

  expect(values).toEqual({
    ...toFormValues(),
    summary: "<p>Initech is hiring.</p>",
    company: "Initech GmbH",
    position: "Frontend Developer",
    companyType: "startup",
    employeeCount: 25,
    salaryCurrency: "EUR",
    salaryPeriod: "year",
    salaryMin: 60_000,
    salaryMax: 70_000,
    bonuses: ["13. Monatsgehalt"],
    benefits: ["Jobrad"],
    employmentType: "fullTime",
    workModel: "remote",
    homeOfficePercentage: 100,
    workingHours: 40,
    workingHoursPeriod: "week",
    locations: ["München"],
    vacationDays: 30,
    startDate: "2027-01-01",
    contractTermKind: "months",
    contractTermMonths: 24,
    contractTermDate: "",
    probationMonths: 6,
    noticePeriodAmount: 3,
    noticePeriodUnit: "months",
    noticePeriodEndOf: "quarter",
    notes: "<ul><li><p>Training budget</p></li></ul>",
    applicationDeadline: "2026-12-31",
  });
  expect(filledFields).toEqual(Object.keys(extraction));
});

test("keeps fields the user already filled in", () => {
  const current = {
    ...toFormValues(),
    description: "<p>Ad</p>",
    company: "Own company name",
    salaryCurrency: "USD" as const,
    locations: ["Berlin"],
    homeOfficePercentage: 0,
    notes: "<p>Own notes</p>",
  };

  const { values, filledFields } = fillEmptyJobFields(current, extraction);

  expect(values).toMatchObject({
    description: "<p>Ad</p>",
    company: "Own company name",
    salaryCurrency: "USD",
    salaryMin: null,
    locations: ["Berlin"],
    homeOfficePercentage: 0,
    notes: "<p>Own notes</p>",
    position: "Frontend Developer",
  });
  expect(filledFields).not.toContain("company");
  expect(filledFields).not.toContain("salary");
  expect(filledFields).not.toContain("locations");
  expect(filledFields).not.toContain("homeOfficePercentage");
  expect(filledFields).not.toContain("notes");
});

test("treats blank text as empty", () => {
  const { values } = fillEmptyJobFields({ ...toFormValues(), company: "  " }, extraction);

  expect(values.company).toBe("Initech GmbH");
});

test("leaves fields empty when nothing was extracted for them", () => {
  const nothingFound: JobExtraction = {
    summary: "",
    company: null,
    position: null,
    companyType: null,
    employeeCount: null,
    salary: null,
    bonuses: [],
    benefits: [],
    employmentType: null,
    workModel: null,
    homeOfficePercentage: null,
    workingHours: null,
    locations: [],
    vacationDays: null,
    startDate: null,
    contractTerm: null,
    probationMonths: null,
    noticePeriod: null,
    notes: "",
    applicationDeadline: null,
  };

  expect(fillEmptyJobFields(toFormValues(), nothingFound)).toEqual({
    values: toFormValues(),
    filledFields: [],
  });
});
