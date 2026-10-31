import {
  activityTypeFields,
  type Activity,
  type ActivityInput,
  type ActivityType,
} from "@appligator/shared";
import { Button, DateInput, Field, submitKeyShortcuts } from "@appligator/ui";
import type { Icon } from "@tabler/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NotesField } from "../details/NotesField.tsx";
import formStyles from "../details/form.module.css";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import {
  toActivityFormValues,
  validateActivityForm,
  type ActivityFormErrors,
  type ActivityPrefill,
  type ActivityFormValues,
} from "./activityFormValues.ts";
import { AttachmentList } from "../attachments/AttachmentList.tsx";
import { useFileCleanup } from "../attachments/useFileCleanup.ts";
import { TermsField } from "./TermsField.tsx";

interface ActivityFormProps<Result> {
  type: ActivityType;
  activity?: Activity;
  prefill?: ActivityPrefill;
  save: UseMutationResult<Result, Error, ActivityInput>;
  onSaved: (result: Result) => void;
  submit: { label: string; icon: Icon };
  header?: ReactNode;
  footer?: ReactNode;
}

export function ActivityForm<Result>({
  type,
  activity,
  prefill,
  save,
  onSaved,
  submit: { label: submitLabel, icon: SubmitIcon },
  header,
  footer,
}: ActivityFormProps<Result>) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => toActivityFormValues(activity, prefill));
  const [errors, setErrors] = useState<ActivityFormErrors>({});
  const files = useFileCleanup(values.attachments);
  const shortcutHints = useShortcutHints();
  const fields = activityTypeFields[type];
  const clearLabel = t("fields.clear");

  function setValue<Key extends keyof ActivityFormValues>(key: Key) {
    return (value: ActivityFormValues[Key]) =>
      setValues((current) => ({ ...current, [key]: value }));
  }

  function errorFor(field: keyof ActivityFormErrors) {
    const error = errors[field];
    return error && t(`fields.errors.${error}`);
  }

  function submitForm(event: FormEvent) {
    event.preventDefault();
    const result = validateActivityForm(type, values);
    setErrors(result.errors ?? {});
    if (!result.input) return;
    // Unlike the callbacks of mutate, the promise also settles when saving unmounts the form,
    // e.g. when applying turns the actions of the job into a link to the application.
    files.save(result.input.attachments, save.mutateAsync(result.input)).then(onSaved, () => {});
  }

  return (
    <form className={formStyles.form} onSubmit={submitForm} noValidate>
      {header}
      <Field label={t("activities.form.occurredAt")} error={errorFor("occurredAt")}>
        <DateInput value={values.occurredAt} onValueChange={setValue("occurredAt")} withTime />
      </Field>
      {fields.includes("appointmentAt") && (
        <Field label={t("activities.form.appointmentAt")}>
          <DateInput
            value={values.appointmentAt}
            onValueChange={setValue("appointmentAt")}
            withTime
            clearable
            clearLabel={clearLabel}
          />
        </Field>
      )}
      {fields.includes("dueDate") && (
        <Field label={t("activities.form.dueDate")}>
          <DateInput
            value={values.dueDate}
            onValueChange={setValue("dueDate")}
            clearable
            clearLabel={clearLabel}
          />
        </Field>
      )}
      {fields.includes("responseDeadline") && (
        <Field label={t("activities.form.responseDeadline")}>
          <DateInput
            value={values.responseDeadline}
            onValueChange={setValue("responseDeadline")}
            clearable
            clearLabel={clearLabel}
          />
        </Field>
      )}
      {fields.includes("terms") && <TermsField terms={values.terms} onChange={setValue("terms")} />}
      <NotesField
        value={values.notes}
        onValueChange={setValue("notes")}
        error={errorFor("notes")}
      />
      <AttachmentList
        attachments={values.attachments}
        onChange={(update) =>
          setValues((current) => {
            const attachments = update(current.attachments);
            files.track(attachments);
            return { ...current, attachments };
          })
        }
      />
      {save.isError && (
        <p role="alert" className={formStyles.saveError}>
          {t("activities.form.saveError")}
        </p>
      )}
      <Button
        type="submit"
        pending={save.isPending}
        shortcutHint={shortcutHints?.submit}
        aria-keyshortcuts={submitKeyShortcuts}
      >
        <SubmitIcon size={20} stroke={2.4} aria-hidden />
        {submitLabel}
      </Button>
      {footer}
    </form>
  );
}
