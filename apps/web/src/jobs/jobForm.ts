import { jobLimits, type Job, type JobExtraction, type JobInput } from "@appligator/shared";
import {
  detailFillers,
  fillEmptyFields,
  parseDetailsForm,
  requiredTextError,
  richTextError,
  toDetailsFormValues,
  type DetailsFormErrors,
  type DetailsFormValues,
  type ExtractedField,
  type FieldError,
  type FieldFiller,
} from "../details/detailsForm.ts";

export interface JobFormValues extends DetailsFormValues {
  link: string;
  description: string;
  summary: string;
  company: string;
  position: string;
  applicationDeadline: string;
}

export type JobFormErrors = DetailsFormErrors &
  Partial<Record<"description" | "summary" | "company" | "position" | "link", FieldError>>;

type ValidationResult =
  | { input: JobInput; errors?: never }
  | { input?: never; errors: JobFormErrors };

export function toFormValues(job?: Job): JobFormValues {
  return {
    link: job?.link ?? "",
    description: job?.description ?? "",
    summary: job?.summary ?? "",
    company: job?.company ?? "",
    position: job?.position ?? "",
    applicationDeadline: job?.applicationDeadline ?? "",
    ...toDetailsFormValues(job),
  };
}

function parseLink(value: string) {
  const link = value.trim();
  if (!link) return null;

  if (/\s/.test(link)) return undefined;

  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(link) ? link : `https://${link}`;
  try {
    const url = new URL(withProtocol);
    const isWebLink = ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
    return isWebLink ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function validateJobForm(values: JobFormValues): ValidationResult {
  const company = values.company.trim();
  const position = values.position.trim();
  const link = parseLink(values.link);
  const details = parseDetailsForm(values);

  const errors: JobFormErrors = {
    description: richTextError(values.description, jobLimits.descriptionLength),
    summary: richTextError(values.summary, jobLimits.summaryLength),
    company: requiredTextError(company, "companyRequired"),
    position: requiredTextError(position, "positionRequired"),
    link: link === undefined ? "linkInvalid" : undefined,
    ...details.errors,
  };

  if (Object.values(errors).some(Boolean) || !details.details) return { errors };

  return {
    input: {
      link: link ?? null,
      description: values.description,
      summary: values.summary,
      company,
      position,
      applicationDeadline: values.applicationDeadline || null,
      ...details.details,
    },
  };
}

const jobFillers: Record<ExtractedField, FieldFiller<JobFormValues>> = {
  summary: {
    isEmpty: (values) => !values.summary,
    fill: ({ summary }) => (summary ? { summary } : null),
  },
  company: {
    isEmpty: (values) => !values.company.trim(),
    fill: ({ company }) => (company ? { company } : null),
  },
  position: {
    isEmpty: (values) => !values.position.trim(),
    fill: ({ position }) => (position ? { position } : null),
  },
  ...detailFillers,
  applicationDeadline: {
    isEmpty: (values) => !values.applicationDeadline,
    fill: ({ applicationDeadline }) => (applicationDeadline ? { applicationDeadline } : null),
  },
};

export function fillEmptyJobFields(values: JobFormValues, extraction: JobExtraction) {
  return fillEmptyFields(values, extraction, jobFillers);
}
