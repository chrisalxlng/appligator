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
  toDetailsFormValues,
  type DetailsFormErrors,
  type DetailsFormValues,
  type FieldError,
} from "../details/detailsForm.ts";

export interface ActivityFormValues extends DetailsFormValues {
  occurredAt: string;
  showsTerms: boolean;
  position: string;
  appointmentAt: string;
  dueDate: string;
  responseDeadline: string;
  attachments: Attachment[];
}

export type ActivityFormErrors = DetailsFormErrors &
  Partial<Record<"occurredAt" | "position", FieldError>>;

type ValidationResult =
  | { input: ActivityInput; errors?: never }
  | { input?: never; errors: ActivityFormErrors };

function padded(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateTime(isoDateTime: string) {
  const date = new Date(isoDateTime);
  const day = `${date.getFullYear()}-${padded(date.getMonth() + 1)}-${padded(date.getDate())}`;
  return `${day}T${padded(date.getHours())}:${padded(date.getMinutes())}`;
}

function toIsoDateTime(localDateTime: string) {
  return new Date(localDateTime).toISOString();
}

export function toActivityFormValues(activity?: Activity): ActivityFormValues {
  const terms = activity?.terms;

  return {
    ...toDetailsFormValues(terms ? { ...terms, notes: "" } : undefined),
    notes: activity?.notes ?? "",
    occurredAt: toLocalDateTime(activity?.occurredAt ?? new Date().toISOString()),
    showsTerms: Boolean(terms),
    position: terms?.position ?? "",
    appointmentAt: activity?.appointmentAt ? toLocalDateTime(activity.appointmentAt) : "",
    dueDate: activity?.dueDate ?? "",
    responseDeadline: activity?.responseDeadline ?? "",
    attachments: activity?.attachments ?? [],
  };
}

function isEmpty(terms: ActivityTerms) {
  return Object.values(terms).every(
    (value) => value === null || (Array.isArray(value) && value.length === 0),
  );
}

export function validateActivityForm(
  type: ActivityType,
  values: ActivityFormValues,
): ValidationResult {
  const position = values.position.trim();
  const details = parseDetailsForm(values);

  const errors: ActivityFormErrors = {
    occurredAt: values.occurredAt ? undefined : "dateRequired",
    position: position.length > jobLimits.textLength ? "tooLong" : undefined,
    ...details.errors,
  };

  if (Object.values(errors).some(Boolean) || !details.details) return { errors };

  const { notes, ...detailTerms } = details.details;
  const terms = { ...detailTerms, position: position || null };
  const fields = activityTypeFields[type];

  return {
    input: {
      type,
      occurredAt: toIsoDateTime(values.occurredAt),
      terms: fields.includes("terms") && !isEmpty(terms) ? terms : null,
      appointmentAt:
        fields.includes("appointmentAt") && values.appointmentAt
          ? toIsoDateTime(values.appointmentAt)
          : null,
      dueDate: (fields.includes("dueDate") && values.dueDate) || null,
      responseDeadline: (fields.includes("responseDeadline") && values.responseDeadline) || null,
      notes,
      attachments: values.attachments,
    },
  };
}
