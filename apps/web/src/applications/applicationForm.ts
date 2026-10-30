import type { Application, ApplicationInput } from "@appligator/shared";
import {
  parseDetailsForm,
  requiredTextError,
  toDetailsFormValues,
  type DetailsFormErrors,
  type DetailsFormValues,
  type FieldError,
} from "../details/detailsForm.ts";

export interface ApplicationFormValues extends DetailsFormValues {
  company: string;
  position: string;
}

export type ApplicationFormErrors = DetailsFormErrors &
  Partial<Record<"company" | "position", FieldError>>;

type ValidationResult =
  | { input: ApplicationInput; errors?: never }
  | { input?: never; errors: ApplicationFormErrors };

export function toApplicationFormValues(application: Application): ApplicationFormValues {
  return {
    company: application.company,
    position: application.position,
    ...toDetailsFormValues(application),
  };
}

export function validateApplicationForm(values: ApplicationFormValues): ValidationResult {
  const company = values.company.trim();
  const position = values.position.trim();
  const details = parseDetailsForm(values);

  const errors: ApplicationFormErrors = {
    company: requiredTextError(company, "companyRequired"),
    position: requiredTextError(position, "positionRequired"),
    ...details.errors,
  };

  if (Object.values(errors).some(Boolean) || !details.details) return { errors };
  return { input: { company, position, ...details.details } };
}
