import { jobLimits, type AiLanguage } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { respondingModel } from "../testLanguageModel.ts";
import { extractJob, extractJobFromPage } from "./extractJob.ts";
import type { JobPage } from "./jobPage.ts";

const modelOutput = {
  company: " Initech GmbH ",
  position: "Frontend Developer",
  companyType: "midsize",
  employeeCount: 1_000.2,
  summary: "Initech builds software.\n\nThe team works <remotely> & in Munich.",
  salary: { currency: "EUR", period: "year", min: 75_000.4, max: 60_000 },
  bonuses: ["13. Monatsgehalt", " "],
  benefits: ["Jobrad"],
  employmentType: "fullTime",
  workModel: "hybrid",
  homeOfficePercentage: 79.6,
  workingHours: { hours: 38.5, period: "week" },
  locations: ["München", " ", "München", "Hamburg"],
  vacationDays: 31.4,
  startDate: "2027-02-01",
  contractTerm: { kind: "months", months: 24, date: null },
  probationMonths: 6,
  noticePeriod: { amount: 4, unit: "weeks", endOf: "month" },
  notes: ["Weiterbildungsbudget von 2.000 € <pro Jahr>", "Reisebereitschaft"],
  applicationDeadline: "2026-12-31",
};

const today = new Date("2026-10-28T12:00:00Z");

async function extract(
  output: object,
  {
    language = "de",
    description = "<p>Ad</p>",
  }: { language?: AiLanguage; description?: string } = {},
) {
  const model = respondingModel(JSON.stringify(output));
  const extraction = await extractJob({ model, description, language, today });
  return { extraction, call: model.doGenerateCalls[0]! };
}

test("returns the extracted job information cleaned up", async () => {
  const { extraction } = await extract(modelOutput);

  expect(extraction).toEqual({
    company: "Initech GmbH",
    position: "Frontend Developer",
    companyType: "midsize",
    employeeCount: 1_000,
    summary:
      "<p>Initech builds software.</p><p>The team works &lt;remotely&gt; &amp; in Munich.</p>",
    salary: { currency: "EUR", period: "year", min: 60_000, max: 75_000 },
    bonuses: ["13. Monatsgehalt"],
    benefits: ["Jobrad"],
    employmentType: "fullTime",
    workModel: "hybrid",
    homeOfficePercentage: 80,
    workingHours: { hours: 38.5, period: "week" },
    locations: ["München", "Hamburg"],
    vacationDays: 31.5,
    startDate: "2027-02-01",
    contractTerm: { kind: "months", months: 24 },
    probationMonths: 6,
    noticePeriod: { amount: 4, unit: "weeks", endOf: "month" },
    notes:
      "<ul><li><p>Weiterbildungsbudget von 2.000 € &lt;pro Jahr&gt;</p></li>" +
      "<li><p>Reisebereitschaft</p></li></ul>",
    applicationDeadline: "2026-12-31",
  });
});

test("returns empty values for missing information", async () => {
  const { extraction } = await extract({
    ...modelOutput,
    company: " ",
    position: null,
    companyType: null,
    employeeCount: null,
    summary: "",
    salary: null,
    bonuses: [],
    benefits: [],
    employmentType: null,
    workModel: null,
    homeOfficePercentage: null,
    workingHours: null,
    locations: [],
    vacationDays: null,
    startDate: "as soon as possible",
    contractTerm: null,
    probationMonths: null,
    noticePeriod: null,
    notes: [],
    applicationDeadline: "end of November",
  });

  expect(extraction).toEqual({
    company: null,
    position: null,
    companyType: null,
    employeeCount: null,
    summary: "",
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
  });
});

test.each([
  ["a company without employees", { employeeCount: 0 }],
  ["a home office share above 100 percent", { homeOfficePercentage: 120 }],
  ["no working hours", { workingHours: { hours: 0, period: "week" } }],
  ["negative vacation days", { vacationDays: -5 }],
  ["a fixed term without duration", { contractTerm: { kind: "months", months: null, date: null } }],
  [
    "a fixed term with an invalid end",
    { contractTerm: { kind: "until", months: null, date: "soon" } },
  ],
  ["a notice period without amount", { noticePeriod: { amount: 0, unit: "months", endOf: null } }],
])("drops %s", async (_case, override) => {
  const { extraction } = await extract({ ...modelOutput, ...override });
  const [field] = Object.keys(override) as (keyof typeof extraction)[];

  expect(extraction[field!]).toBeNull();
});

test("keeps the most valuable benefits only", async () => {
  const benefits = Array.from({ length: 10 }, (_, index) => `Benefit ${index}`);

  const { extraction } = await extract({ ...modelOutput, benefits });

  expect(extraction.benefits).toEqual(benefits.slice(0, 6));
});

test("keeps the notes within the length limit", async () => {
  const notes = Array.from({ length: jobLimits.listItems }, (_, index) =>
    `${index} `.padEnd(jobLimits.textLength, "x"),
  );

  const { extraction } = await extract({ ...modelOutput, notes });

  expect(extraction.notes.length).toBeLessThanOrEqual(jobLimits.notesLength);
  expect(extraction.notes).toMatch(/^<ul>.*<\/ul>$/);
});

test("drops an implausible salary", async () => {
  const { extraction } = await extract({
    ...modelOutput,
    salary: { currency: "EUR", period: "year", min: -1, max: 1 },
  });

  expect(extraction.salary).toBeNull();
});

test("sends the ad as plain text and asks for the configured language", async () => {
  const { call } = await extract(modelOutput, {
    language: "en",
    description: "<h2>Über uns</h2><p>Wir bauen <strong>Software</strong>.</p>",
  });

  const [system, user] = call.prompt;
  expect(system).toMatchObject({ role: "system" });
  expect(system!.content).toContain(
    "Write the summary, locations, bonuses, benefits and notes in English",
  );
  expect(system!.content).toContain("Today is 2026-10-28.");
  expect(user).toMatchObject({
    role: "user",
    content: [{ type: "text", text: "Über uns\nWir bauen Software." }],
  });
  expect(call.responseFormat).toMatchObject({ type: "json" });
});

const pageBlocks: JobPage["blocks"] = [
  { kind: "paragraph", text: "Cookies akzeptieren" },
  { kind: "heading", text: "Frontend Developer" },
  { kind: "listItem", text: "TypeScript" },
  { kind: "paragraph", text: "Ähnliche Jobs" },
];

async function extractFromPage(output: object, page: Partial<JobPage> = {}) {
  const model = respondingModel(JSON.stringify(output));
  const result = await extractJobFromPage({
    model,
    page: { title: "Frontend Developer (m/w/d)", posting: null, blocks: pageBlocks, ...page },
    language: "de",
    today,
  });
  const [, user] = model.doGenerateCalls[0]!.prompt;
  return { ...result, prompt: user!.content };
}

test("sends the numbered page blocks and keeps the blocks of the job ad as description", async () => {
  const { extraction, description, prompt } = await extractFromPage({
    ...modelOutput,
    jobAd: { firstBlock: 1, lastBlock: 2 },
  });

  expect(prompt).toEqual([
    {
      type: "text",
      text:
        "Page title: Frontend Developer (m/w/d)\n\n" +
        "Page content in numbered blocks. Ignore blocks that are not about this job, " +
        "such as navigation, ads or other jobs.\n\n" +
        "[0] Cookies akzeptieren\n[1] Frontend Developer\n[2] - TypeScript\n[3] Ähnliche Jobs",
    },
  ]);
  expect(description).toBe("<h2>Frontend Developer</h2><ul><li><p>TypeScript</p></li></ul>");
  expect(extraction).toMatchObject({ company: "Initech GmbH", position: "Frontend Developer" });
});

test.each([
  ["a reversed range", { firstBlock: 2, lastBlock: 1 }, 2],
  ["a range beyond the page", { firstBlock: -3, lastBlock: 99 }, 4],
])("keeps the job ad blocks within %s", async (_case, jobAd, blockCount) => {
  const { description } = await extractFromPage({ ...modelOutput, jobAd });

  expect(description.match(/<p>|<h2>/g)).toHaveLength(blockCount);
});

test("has no description when the page shows no job ad", async () => {
  const { description } = await extractFromPage({ ...modelOutput, jobAd: null });

  expect(description).toBe("");
});

test("uses the page title when the job title is missing", async () => {
  const { extraction } = await extractFromPage({ ...modelOutput, position: " ", jobAd: null });

  expect(extraction.position).toBe("Frontend Developer (m/w/d)");
});

test("sends the structured job posting and keeps its description", async () => {
  const { description, prompt } = await extractFromPage(modelOutput, {
    posting: {
      details: { "@type": "JobPosting", title: "Frontend Developer" },
      blocks: [{ kind: "paragraph", text: "Wir bauen Software." }],
    },
  });

  expect(prompt).toEqual([
    {
      type: "text",
      text:
        "Page title: Frontend Developer (m/w/d)\n\n" +
        'Structured data: {"@type":"JobPosting","title":"Frontend Developer"}\n\n' +
        "Job ad:\nWir bauen Software.",
    },
  ]);
  expect(description).toBe("<p>Wir bauen Software.</p>");
});

test("limits the page content sent to the model", async () => {
  const longBlock = { kind: "paragraph" as const, text: "x".repeat(30_000) };
  const { description } = await extractFromPage(
    { ...modelOutput, jobAd: { firstBlock: 0, lastBlock: 2 } },
    { blocks: [longBlock, longBlock, longBlock] },
  );

  expect(description.match(/<p>/g)).toHaveLength(1);
});

test("keeps the description within the length a job allows", async () => {
  const listItems = Array.from({ length: 20_000 }, () => ({
    kind: "listItem" as const,
    text: "&",
  }));
  const { description } = await extractFromPage(
    { ...modelOutput, jobAd: { firstBlock: 0, lastBlock: listItems.length - 1 } },
    { blocks: listItems },
  );

  expect(description.length).toBeLessThanOrEqual(jobLimits.descriptionLength);
});
