import {
  activityTypeFields,
  type Activity,
  type ActivityInput,
  type ActivityType,
} from "@appligator/shared";
import { Button, DateInput, Field, submitKeyShortcuts, TextInput } from "@appligator/ui";
import { IconPlus, type Icon } from "@tabler/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DetailsFields } from "../details/DetailsFields.tsx";
import { NotesField } from "../details/NotesField.tsx";
import formStyles from "../details/form.module.css";
import listStyles from "../details/TextList.module.css";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import {
  toActivityFormValues,
  validateActivityForm,
  type ActivityFormErrors,
  type ActivityFormValues,
} from "./activityFormValues.ts";
import styles from "./ActivityForm.module.css";
import { AttachmentList } from "./AttachmentList.tsx";

interface ActivityFormProps<Result> {
  type: ActivityType;
  activity?: Activity;
  save: UseMutationResult<Result, Error, ActivityInput>;
  onSaved: (result: Result) => void;
  submit: { label: string; icon: Icon };
  header?: ReactNode;
  footer?: ReactNode;
}

export function ActivityForm<Result>({
  type,
  activity,
  save,
  onSaved,
  submit: { label: submitLabel, icon: SubmitIcon },
  header,
  footer,
}: ActivityFormProps<Result>) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => toActivityFormValues(activity));
  const [errors, setErrors] = useState<ActivityFormErrors>({});
  const shortcutHints = useShortcutHints();
  const termsTitleId = useId();
  const fields = activityTypeFields[type];
  const clearLabel = t("fields.clear");

  function update(changes: Partial<ActivityFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  function setValue<Key extends keyof ActivityFormValues>(key: Key) {
    return (value: ActivityFormValues[Key]) => update({ [key]: value });
  }

  function errorFor(field: keyof ActivityFormErrors) {
    const error = errors[field];
    return error && t(`fields.errors.${error}`);
  }

  function submitForm(event: FormEvent) {
    event.preventDefault();
    const result = validateActivityForm(type, values);
    setErrors(result.errors ?? {});
    if (result.input) save.mutate(result.input, { onSuccess: onSaved });
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
      <NotesField
        value={values.notes}
        onValueChange={setValue("notes")}
        error={errorFor("notes")}
      />
      <AttachmentList attachments={values.attachments} onChange={setValue("attachments")} />
      {fields.includes("terms") &&
        (values.showsTerms ? (
          <section className={styles.terms} aria-labelledby={termsTitleId}>
            <h3 id={termsTitleId} className={styles.termsTitle}>
              {t("activities.form.terms")}
            </h3>
            <Field label={t("fields.position")} error={errorFor("position")}>
              <TextInput value={values.position} onValueChange={setValue("position")} />
            </Field>
            <DetailsFields values={values} onChange={update} errorFor={errorFor} />
          </section>
        ) : (
          <button
            type="button"
            className={listStyles.addButton}
            onClick={() => update({ showsTerms: true })}
          >
            <IconPlus size={20} stroke={2.4} aria-hidden />
            {t("activities.form.addTerms")}
          </button>
        ))}
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
