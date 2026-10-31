import {
  activityTypeFields,
  jobLimits,
  type Activity,
  type ActivityInput,
  type ActivityTerms,
  type ActivityType,
  type Attachment,
} from "@appligator/shared";
import {
  parseDetailsForm,
  richTextError,
  toDetailsFormValues,
  type DetailsFormErrors,
  type DetailsFormValues,
  type FieldError,
} from "../details/detailsForm.ts";
import { toIsoDateTime, toLocalDateTime } from "../details/localDateTime.ts";

export interface ActivityFormValues {
  occurredAt: string;
  appointmentAt: string;
  dueDate: string;
  responseDeadline: string;
  terms: ActivityTerms | null;
  notes: string;
  attachments: Attachment[];
}

export type ActivityFormErrors = Partial<Record<"occurredAt" | "notes", FieldError>>;

type ValidationResult =
  | { input: ActivityInput; errors?: never }
  | { input?: never; errors: ActivityFormErrors };

export type ActivityPrefill = Pick<ActivityInput, "terms" | "notes">;

export function toActivityFormValues(
  activity?: Activity,
  prefill?: ActivityPrefill,
): ActivityFormValues {
  return {
    occurredAt: toLocalDateTime(activity?.occurredAt ?? new Date().toISOString()),
    appointmentAt: activity?.appointmentAt ? toLocalDateTime(activity.appointmentAt) : "",
    dueDate: activity?.dueDate ?? "",
    responseDeadline: activity?.responseDeadline ?? "",
    terms: (activity ?? prefill)?.terms ?? null,
    notes: (activity ?? prefill)?.notes ?? "",
    attachments: activity?.attachments ?? [],
  };
}

export function validateActivityForm(
  type: ActivityType,
  values: ActivityFormValues,
): ValidationResult {
  const errors: ActivityFormErrors = {
    occurredAt: values.occurredAt ? undefined : "dateRequired",
    notes: richTextError(values.notes, jobLimits.notesLength),
  };
  if (Object.values(errors).some(Boolean)) return { errors };

  const fields = activityTypeFields[type];
  return {
    input: {
      type,
      occurredAt: toIsoDateTime(values.occurredAt),
      terms: fields.includes("terms") ? values.terms : null,
      appointmentAt:
        fields.includes("appointmentAt") && values.appointmentAt
          ? toIsoDateTime(values.appointmentAt)
          : null,
      dueDate: (fields.includes("dueDate") && values.dueDate) || null,
      responseDeadline: (fields.includes("responseDeadline") && values.responseDeadline) || null,
      notes: values.notes,
      attachments: values.attachments,
    },
  };
}

export interface TermsFormValues extends DetailsFormValues {
  position: string;
}

export type TermsFormErrors = DetailsFormErrors & Partial<Record<"position", FieldError>>;

type TermsResult =
  | { terms: ActivityTerms | null; errors?: never }
  | { terms?: never; errors: TermsFormErrors };

export function toTermsFormValues(terms: ActivityTerms | null): TermsFormValues {
  return {
    ...toDetailsFormValues(terms ? { ...terms, notes: "" } : undefined),
    position: terms?.position ?? "",
  };
}

function isEmpty(terms: ActivityTerms) {
  return Object.values(terms).every(
    (value) => value === null || (Array.isArray(value) && value.length === 0),
  );
}

export function validateTermsForm(values: TermsFormValues): TermsResult {
  const position = values.position.trim();
  const details = parseDetailsForm(values);

  const errors: TermsFormErrors = {
    position: position.length > jobLimits.textLength ? "tooLong" : undefined,
    ...details.errors,
  };
  if (Object.values(errors).some(Boolean) || !details.details) return { errors };

  const { notes: _notes, ...detailTerms } = details.details;
  const terms = { ...detailTerms, position: position || null };
  return { terms: isEmpty(terms) ? null : terms };
}
