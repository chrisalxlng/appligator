import { jobInputSchema, type Job, type JobExtraction } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { fillEmptyFields, toFormValues, validateJobForm, type JobFormValues } from "./jobForm.ts";

const job: Job = {
  id: "8f9c1a52-7d1e-4b8a-9a43-1c2d3e4f5a6b",
  link: "https://www.stepstone.de/jobs/view/123",
  description: "<p>Description</p>",
  summary: "<p>Summary</p>",
  company: "Randstad Digital Germany AG",
  position: "Lead Developer Frontend",
  salary: { currency: "EUR", period: "year", min: 65_000, max: 75_000 },
  locations: ["Düsseldorf", "Hamburg"],
  workModel: "hybrid",
  employmentType: "fullTime",
  applicationDeadline: "2026-12-31",
  createdAt: "2026-10-28T09:00:00.000Z",
  updatedAt: "2026-10-28T09:00:00.000Z",
};

function valuesWith(overrides: Partial<JobFormValues>): JobFormValues {
  return { ...toFormValues(), company: "Initech", position: "Developer", ...overrides };
}

test("turns the values of an existing job back into the same input", () => {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = job;

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
    salary: null,
    locations: [],
    workModel: null,
    employmentType: null,
    applicationDeadline: null,
  });
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

const extraction: JobExtraction = {
  summary: "<p>Initech is hiring.</p>",
  company: "Initech GmbH",
  position: "Frontend Developer",
  salary: { currency: "EUR", period: "year", min: 60_000, max: 70_000 },
  locations: ["München"],
  workModel: "remote",
  employmentType: "fullTime",
  applicationDeadline: "2026-12-31",
};

test("fills all empty fields with the extracted job information", () => {
  const { values, filledFields } = fillEmptyFields(toFormValues(), extraction);

  expect(values).toEqual({
    ...toFormValues(),
    summary: "<p>Initech is hiring.</p>",
    company: "Initech GmbH",
    position: "Frontend Developer",
    salaryCurrency: "EUR",
    salaryPeriod: "year",
    salaryMin: 60_000,
    salaryMax: 70_000,
    locations: ["München"],
    workModel: "remote",
    employmentType: "fullTime",
    applicationDeadline: "2026-12-31",
  });
  expect(filledFields).toEqual([
    "summary",
    "company",
    "position",
    "salary",
    "locations",
    "workModel",
    "employmentType",
    "applicationDeadline",
  ]);
});

test("keeps fields the user already filled in", () => {
  const current = {
    ...toFormValues(),
    description: "<p>Ad</p>",
    company: "Own company name",
    salaryCurrency: "USD" as const,
    locations: ["Berlin"],
  };

  const { values, filledFields } = fillEmptyFields(current, extraction);

  expect(values).toMatchObject({
    description: "<p>Ad</p>",
    company: "Own company name",
    salaryCurrency: "USD",
    salaryMin: null,
    locations: ["Berlin"],
    position: "Frontend Developer",
  });
  expect(filledFields).not.toContain("company");
  expect(filledFields).not.toContain("salary");
  expect(filledFields).not.toContain("locations");
});

test("treats blank text as empty", () => {
  const { values } = fillEmptyFields({ ...toFormValues(), company: "  " }, extraction);

  expect(values.company).toBe("Initech GmbH");
});

test("leaves fields empty when nothing was extracted for them", () => {
  const nothingFound: JobExtraction = {
    summary: "",
    company: null,
    position: null,
    salary: null,
    locations: [],
    workModel: null,
    employmentType: null,
    applicationDeadline: null,
  };

  expect(fillEmptyFields(toFormValues(), nothingFound)).toEqual({
    values: toFormValues(),
    filledFields: [],
  });
});
