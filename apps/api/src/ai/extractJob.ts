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
import { htmlToText } from "./htmlToText.ts";

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

type Extraction = z.infer<typeof extractionSchema>;

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

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

interface ExtractJobOptions {
  model: LanguageModel;
  description: string;
  language: AiLanguage;
  today: Date;
  abortSignal?: AbortSignal;
}

export async function extractJob({
  model,
  description,
  language,
  today,
  abortSignal,
}: ExtractJobOptions) {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: extractionSchema }),
    system: instructions(language, today.toISOString().slice(0, 10)),
    prompt: htmlToText(description).slice(0, maxDescriptionLength),
    timeout: 90_000,
    abortSignal,
  });
  return toJobExtraction(output);
}
