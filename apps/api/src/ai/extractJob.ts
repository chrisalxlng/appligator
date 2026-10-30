import {
  contractTermKinds,
  currencies,
  employmentTypes,
  jobLimits,
  maxNoticePeriod,
  noticePeriodEnds,
  noticePeriodUnits,
  salaryPeriods,
  workingHoursPeriods,
  workModels,
  type AiLanguage,
  type ContractTerm,
  type JobExtraction,
  type NoticePeriod,
  type WorkingHours,
} from "@appligator/shared";
import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { escapeHtml, htmlToText } from "./htmlToText.ts";
import { blocksToHtml, type Block, type JobPage } from "./jobPage.ts";

const maxPromptLength = 50_000;
const maxBenefits = 6;

const languageNames: Record<AiLanguage, string> = { de: "German", en: "English" };

const extractionSchema = z.object({
  company: z.string().nullable().describe("Name of the hiring company as stated in the ad."),
  position: z
    .string()
    .nullable()
    .describe("Job title as stated in the ad, without gender markers such as (m/w/d)."),
  summary: z
    .string()
    .describe(
      "Summary of the role, tasks, requirements, team and company in 3 to 5 sentences of plain " +
        "prose. Leave out what the other fields cover, such as salary, bonuses, benefits, work " +
        "model, home office, working hours, locations, vacation days, start date, contract term, " +
        "probation, notice period and deadline. No bullet points, headings or markdown.",
    ),
  salary: z
    .object({
      currency: z.enum(currencies),
      period: z.enum(salaryPeriods),
      min: z.number().describe("Lower bound in whole currency units."),
      max: z.number().describe("Upper bound in whole currency units; equals min for one amount."),
    })
    .nullable()
    .describe("Only if the ad states an amount in one of the supported currencies."),
  bonuses: z
    .array(z.string())
    .describe("Pay on top of the salary, such as a 13th salary or profit sharing, as short items."),
  benefits: z
    .array(z.string())
    .describe(
      `At most ${maxBenefits} perks with a tangible value, such as a job bike, a company pension, a public ` +
        "transport ticket, a sabbatical or childcare, the most valuable first, each in 1 to 4 " +
        "words. Leave out vague or common perks such as flat hierarchies, a modern office, free " +
        "drinks, fruit or team events, and what another field covers, such as bonuses, home " +
        "office, working hours or vacation days.",
    ),
  employmentType: z
    .enum(employmentTypes)
    .nullable()
    .describe("workingStudent is a part-time job for enrolled students."),
  workModel: z.enum(workModels).nullable(),
  homeOfficePercentage: z
    .number()
    .nullable()
    .describe("Share of the working time that can be spent working from home, from 0 to 100."),
  workingHours: z
    .object({ hours: z.number(), period: z.enum(workingHoursPeriods) })
    .nullable()
    .describe("Regular working hours, for a range the upper bound."),
  locations: z
    .array(z.string())
    .describe("Cities or regions the job is based in. Do not list remote as a location."),
  vacationDays: z.number().nullable().describe("Vacation days per year, may include a half day."),
  startDate: z
    .string()
    .nullable()
    .describe(
      "Start date as YYYY-MM-DD, only if the ad states a date rather than 'as soon as possible'.",
    ),
  contractTerm: z
    .object({
      kind: z.enum(contractTermKinds),
      months: z.number().nullable().describe("Duration of a fixed-term contract in months."),
      date: z.string().nullable().describe("End date of a fixed-term contract as YYYY-MM-DD."),
    })
    .nullable()
    .describe("Whether the contract is permanent or fixed-term, only if the ad states it."),
  probationMonths: z.number().nullable().describe("Probation period in months."),
  noticePeriod: z
    .object({
      amount: z.number(),
      unit: z.enum(noticePeriodUnits),
      endOf: z
        .enum(noticePeriodEnds)
        .nullable()
        .describe("Set for a notice period that ends at the end of a month or quarter."),
    })
    .nullable(),
  notes: z
    .array(z.string())
    .describe(
      "Other facts that matter for deciding on or applying for the job and fit no other field, " +
        "such as a training budget, travel or required documents, as short sentences.",
    ),
  applicationDeadline: z
    .string()
    .nullable()
    .describe("Deadline for applications as YYYY-MM-DD, only if the ad states one."),
});

const pageExtractionSchema = extractionSchema.extend({
  jobAd: z
    .object({ firstBlock: z.int(), lastBlock: z.int() })
    .nullable()
    .describe(
      "Numbers of the first and last page block of the job description text, such as the " +
        "company introduction, tasks, requirements and benefits. Start after any header above it " +
        "that repeats the job title, company or location or shows posting dates, applicant " +
        "numbers, buttons, ads or contacts, and after a section label like 'About the job'. " +
        "null if the page shows no job ad.",
    ),
});

type Extraction = z.infer<typeof extractionSchema>;
type PageExtraction = z.infer<typeof pageExtractionSchema>;

function instructions(language: AiLanguage, today: string) {
  const languageName = languageNames[language];
  return [
    "You extract information from job ads for a job application tracker.",
    "Only use information the ad states. Use null or an empty list for anything it does not state.",
    `Write the summary, locations, bonuses, benefits and notes in ${languageName}, ` +
      "even if the ad uses another language.",
    "Keep the company name and the job title as written in the ad.",
    `Today is ${today}. Resolve deadlines without a year relative to today.`,
  ].join("\n");
}

function cleanText(value: string | null) {
  const text = value?.trim();
  return text ? text.slice(0, jobLimits.textLength) : null;
}

function cleanSalary(salary: Extraction["salary"]) {
  if (!salary) return null;

  const min = Math.round(Math.min(salary.min, salary.max));
  const max = Math.round(Math.max(salary.min, salary.max));
  const isPlausible =
    Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max <= jobLimits.salary;
  return isPlausible ? { currency: salary.currency, period: salary.period, min, max } : null;
}

function cleanTextList(items: string[]) {
  const unique = new Set(items.map(cleanText).filter((item) => item !== null));
  return [...unique].slice(0, jobLimits.listItems);
}

function cleanDate(date: string | null) {
  return z.iso.date().safeParse(date?.trim()).data ?? null;
}

function cleanInteger(value: number | null, min: number, max: number) {
  if (value === null) return null;
  const integer = Math.round(value);
  return integer >= min && integer <= max ? integer : null;
}

function cleanVacationDays(vacationDays: number | null) {
  if (vacationDays === null) return null;
  const halfDays = Math.round(vacationDays * 2) / 2;
  return halfDays >= 0 && halfDays <= jobLimits.vacationDays ? halfDays : null;
}

function cleanWorkingHours(workingHours: Extraction["workingHours"]): WorkingHours | null {
  if (!workingHours) return null;

  const hours = Math.round(workingHours.hours * 100) / 100;
  const isPlausible = hours > 0 && hours <= jobLimits.workingHours;
  return isPlausible ? { hours, period: workingHours.period } : null;
}

function cleanContractTerm(contractTerm: Extraction["contractTerm"]): ContractTerm | null {
  switch (contractTerm?.kind) {
    case "permanent":
      return { kind: "permanent" };
    case "months": {
      const months = cleanInteger(contractTerm.months, 1, jobLimits.months);
      return months === null ? null : { kind: "months", months };
    }
    case "until": {
      const date = cleanDate(contractTerm.date);
      return date === null ? null : { kind: "until", date };
    }
    default:
      return null;
  }
}

function cleanNoticePeriod(noticePeriod: Extraction["noticePeriod"]): NoticePeriod | null {
  if (!noticePeriod) return null;

  const { unit, endOf } = noticePeriod;
  const amount = cleanInteger(noticePeriod.amount, 1, maxNoticePeriod(unit));
  return amount === null ? null : { amount, unit, endOf };
}

function toBulletList(items: string[]) {
  let length = "<ul></ul>".length;
  const listItems = cleanTextList(items)
    .map((item) => `<li><p>${escapeHtml(item)}</p></li>`)
    .filter((listItem) => (length += listItem.length) <= jobLimits.notesLength);
  return listItems.length > 0 ? `<ul>${listItems.join("")}</ul>` : "";
}

function toParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function toJobExtraction(extraction: Extraction): JobExtraction {
  return {
    summary: toParagraphs(extraction.summary),
    company: cleanText(extraction.company),
    position: cleanText(extraction.position),
    salary: cleanSalary(extraction.salary),
    bonuses: cleanTextList(extraction.bonuses),
    benefits: cleanTextList(extraction.benefits).slice(0, maxBenefits),
    employmentType: extraction.employmentType,
    workModel: extraction.workModel,
    homeOfficePercentage: cleanInteger(extraction.homeOfficePercentage, 0, 100),
    workingHours: cleanWorkingHours(extraction.workingHours),
    locations: cleanTextList(extraction.locations),
    vacationDays: cleanVacationDays(extraction.vacationDays),
    startDate: cleanDate(extraction.startDate),
    contractTerm: cleanContractTerm(extraction.contractTerm),
    probationMonths: cleanInteger(extraction.probationMonths, 0, jobLimits.months),
    noticePeriod: cleanNoticePeriod(extraction.noticePeriod),
    notes: toBulletList(extraction.notes),
    applicationDeadline: cleanDate(extraction.applicationDeadline),
  };
}

interface ExtractionOptions {
  model: LanguageModel;
  language: AiLanguage;
  today: Date;
  abortSignal?: AbortSignal;
}

async function generateExtraction<Result>(
  schema: z.ZodType<Result>,
  prompt: string,
  { model, language, today, abortSignal }: ExtractionOptions,
) {
  const { output } = await generateText({
    model,
    output: Output.object({ schema }),
    system: instructions(language, today.toISOString().slice(0, 10)),
    prompt: prompt.slice(0, maxPromptLength),
    timeout: 90_000,
    abortSignal,
  });
  return output;
}

export async function extractJob({
  description,
  ...options
}: ExtractionOptions & { description: string }) {
  return toJobExtraction(
    await generateExtraction(extractionSchema, htmlToText(description), options),
  );
}

// The description keeps the blocks as HTML, which escaping and markup make longer than the text.
const maxBlockMarkupLength = "<ul><li><p></p></li></ul>".length;

function limitBlocks(blocks: Block[]) {
  let textLength = 0;
  let htmlLength = 0;
  return blocks.filter(({ text }) => {
    textLength += text.length + 1;
    htmlLength += escapeHtml(text).length + maxBlockMarkupLength;
    return textLength <= maxPromptLength && htmlLength <= jobLimits.descriptionLength;
  });
}

function blocksToText(blocks: Block[]) {
  return blocks.map(({ kind, text }) => (kind === "listItem" ? `- ${text}` : text)).join("\n");
}

function postingPrompt(title: string, details: Record<string, unknown>, blocks: Block[]) {
  return [
    `Page title: ${title}`,
    `Structured data: ${JSON.stringify(details)}`,
    `Job ad:\n${blocksToText(blocks)}`,
  ].join("\n\n");
}

function pagePrompt(title: string, blocks: Block[]) {
  const numberedBlocks = blocks.map((block, index) => `[${index}] ${blocksToText([block])}`);
  return [
    `Page title: ${title}`,
    "Page content in numbered blocks. Ignore blocks that are not about this job, " +
      "such as navigation, ads or other jobs.",
    numberedBlocks.join("\n"),
  ].join("\n\n");
}

function jobAdBlocks(blocks: Block[], jobAd: PageExtraction["jobAd"]) {
  if (!jobAd) return [];
  const first = Math.max(0, Math.min(jobAd.firstBlock, jobAd.lastBlock));
  const last = Math.max(jobAd.firstBlock, jobAd.lastBlock);
  return blocks.slice(first, last + 1);
}

function withPageTitleAsPosition(extraction: Extraction, page: JobPage) {
  return toJobExtraction({ ...extraction, position: cleanText(extraction.position) ?? page.title });
}

export async function extractJobFromPage({
  page,
  ...options
}: ExtractionOptions & { page: JobPage }) {
  if (page.posting) {
    const blocks = limitBlocks(page.posting.blocks);
    const prompt = postingPrompt(page.title, page.posting.details, blocks);
    const extraction = await generateExtraction(extractionSchema, prompt, options);
    return {
      extraction: withPageTitleAsPosition(extraction, page),
      description: blocksToHtml(blocks),
    };
  }

  const blocks = limitBlocks(page.blocks);
  const { jobAd, ...extraction } = await generateExtraction(
    pageExtractionSchema,
    pagePrompt(page.title, blocks),
    options,
  );
  return {
    extraction: withPageTitleAsPosition(extraction, page),
    description: blocksToHtml(jobAdBlocks(blocks, jobAd)),
  };
}
