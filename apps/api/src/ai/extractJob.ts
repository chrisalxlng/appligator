import {
  currencies,
  employmentTypes,
  salaryPeriods,
  workModels,
  type AiLanguage,
  type JobExtraction,
} from "@appligator/shared";
import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { escapeHtml, htmlToText } from "./htmlToText.ts";
import { blocksToHtml, type Block, type JobPage } from "./jobPage.ts";

const maxDescriptionLength = 50_000;
const maxTextLength = 200;
const maxLocations = 50;
const maxSalary = 100_000_000;

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
      "Summary of the role, tasks, requirements and benefits in 3 to 5 sentences of plain prose. " +
        "No bullet points, headings or markdown.",
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
  locations: z
    .array(z.string())
    .describe("Cities or regions the job is based in. Do not list remote as a location."),
  workModel: z.enum(workModels).nullable(),
  employmentType: z
    .enum(employmentTypes)
    .nullable()
    .describe("workingStudent is a part-time job for enrolled students."),
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
      "Numbers of the first and last page block of the job ad itself, without navigation, " +
        "cookie notices, similar jobs or other page content. null if the page shows no job ad.",
    ),
});

type Extraction = z.infer<typeof extractionSchema>;
type PageExtraction = z.infer<typeof pageExtractionSchema>;

function instructions(language: AiLanguage, today: string) {
  const languageName = languageNames[language];
  return [
    "You extract information from job ads for a job application tracker.",
    "Only use information the ad states. Use null or an empty list for anything it does not state.",
    `Write the summary and the locations in ${languageName}, even if the ad uses another language.`,
    "Keep the company name and the job title as written in the ad.",
    `Today is ${today}. Resolve deadlines without a year relative to today.`,
  ].join("\n");
}

function cleanText(value: string | null) {
  const text = value?.trim();
  return text ? text.slice(0, maxTextLength) : null;
}

function cleanSalary(salary: Extraction["salary"]) {
  if (!salary) return null;

  const min = Math.round(Math.min(salary.min, salary.max));
  const max = Math.round(Math.max(salary.min, salary.max));
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > maxSalary) return null;
  return { currency: salary.currency, period: salary.period, min, max };
}

function cleanLocations(locations: string[]) {
  const unique = new Set(locations.map(cleanText).filter((location) => location !== null));
  return [...unique].slice(0, maxLocations);
}

function cleanDate(date: string | null) {
  return z.iso.date().safeParse(date?.trim()).data ?? null;
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
    locations: cleanLocations(extraction.locations),
    workModel: extraction.workModel,
    employmentType: extraction.employmentType,
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
    prompt: prompt.slice(0, maxDescriptionLength),
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

function limitBlocks(blocks: Block[]) {
  let length = 0;
  return blocks.filter(({ text }) => (length += text.length + 1) <= maxDescriptionLength);
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
    "Page content in numbered blocks. Only use the blocks of the job ad.",
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
