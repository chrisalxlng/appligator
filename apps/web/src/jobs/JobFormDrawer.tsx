import type { Job, JobExtraction } from "@appligator/shared";
import {
  Button,
  DateInput,
  Drawer,
  Field,
  RichTextEditor,
  submitKeyShortcuts,
  TextInput,
  useSuccessToast,
} from "@appligator/ui";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { DetailsFields } from "../details/DetailsFields.tsx";
import { NotesField } from "../details/NotesField.tsx";
import styles from "../details/form.module.css";
import { useFormatLabels } from "../details/useFormatLabels.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { JobAnalysisStatus } from "./JobAnalysisStatus.tsx";
import { useSaveJob } from "./jobQueries.ts";
import {
  fillEmptyJobFields,
  toFormValues,
  validateJobForm,
  type JobFormErrors,
  type JobFormValues,
} from "./jobForm.ts";
import { useJobAnalysis } from "./useJobAnalysis.ts";

interface JobFormDrawerProps {
  job?: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (job: Job) => void;
}

export function JobFormDrawer({ job, open, onOpenChange, onSaved }: JobFormDrawerProps) {
  const { t } = useTranslation();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const showSuccess = useSuccessToast();

  function handleSaved(savedJob: Job) {
    onOpenChange(false);
    showSuccess(t(job ? "jobs.toast.updated" : "jobs.toast.added"));
    onSaved?.(savedJob);
  }

  return (
    <Drawer
      title={t(job ? "jobs.form.editTitle" : "jobs.form.addTitle")}
      closeLabel={t("common.close")}
      open={open}
      onOpenChange={onOpenChange}
      initialFocus={job ? undefined : firstFieldRef}
    >
      <JobForm job={job} firstFieldRef={firstFieldRef} onSaved={handleSaved} />
    </Drawer>
  );
}

interface JobFormProps {
  job?: Job;
  firstFieldRef: RefObject<HTMLInputElement | null>;
  onSaved: (job: Job) => void;
}

function JobForm({ job, firstFieldRef, onSaved }: JobFormProps) {
  const { t } = useTranslation();
  const formatLabels = useFormatLabels();
  const save = useSaveJob(job?.id);
  const [values, setValues] = useState(() => toFormValues(job));
  const [errors, setErrors] = useState<JobFormErrors>({});
  const shortcutHints = useShortcutHints();
  const valuesRef = useRef(values);
  const { analysis, analyzePaste, retry, dismiss } = useJobAnalysis(applyExtraction);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  function applyExtraction(extraction: JobExtraction) {
    const filled = fillEmptyJobFields(valuesRef.current, extraction);
    setValues(filled.values);
    return filled.filledFields;
  }

  function update(changes: Partial<JobFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  function setValue<Key extends keyof JobFormValues>(key: Key) {
    return (value: JobFormValues[Key]) => update({ [key]: value });
  }

  function errorFor(field: keyof JobFormErrors) {
    const error = errors[field];
    return error && t(`fields.errors.${error}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateJobForm(values);
    setErrors(result.errors ?? {});
    if (result.input) save.mutate(result.input, { onSuccess: onSaved });
  }

  const clearLabel = t("fields.clear");

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t("fields.link")} error={errorFor("link")}>
        <TextInput
          ref={firstFieldRef}
          type="url"
          value={values.link}
          onValueChange={setValue("link")}
        />
      </Field>
      <Field label={t("fields.description")} error={errorFor("description")}>
        <RichTextEditor
          value={values.description}
          onValueChange={setValue("description")}
          onValuePaste={(description) => analyzePaste(valuesRef.current.description, description)}
          formatLabels={formatLabels}
        />
      </Field>
      <JobAnalysisStatus
        analysis={analysis}
        onRetry={() => retry(values.description)}
        onDismiss={dismiss}
      />
      <Field label={t("fields.summary")} error={errorFor("summary")}>
        <RichTextEditor
          value={values.summary}
          onValueChange={setValue("summary")}
          formatLabels={formatLabels}
        />
      </Field>
      <Field label={t("fields.company")} error={errorFor("company")}>
        <TextInput value={values.company} onValueChange={setValue("company")} />
      </Field>
      <Field label={t("fields.position")} error={errorFor("position")}>
        <TextInput value={values.position} onValueChange={setValue("position")} />
      </Field>
      <Field label={t("fields.applicationDeadline")}>
        <DateInput
          value={values.applicationDeadline}
          onValueChange={setValue("applicationDeadline")}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
      <DetailsFields values={values} onChange={update} errorFor={errorFor} />
      <NotesField
        value={values.notes}
        onValueChange={setValue("notes")}
        error={errorFor("notes")}
      />
      {save.isError && (
        <p role="alert" className={styles.saveError}>
          {t("jobs.form.saveError")}
        </p>
      )}
      <Button
        type="submit"
        pending={save.isPending}
        shortcutHint={shortcutHints?.submit}
        aria-keyshortcuts={submitKeyShortcuts}
      >
        {job ? (
          <IconPencil size={20} stroke={2.4} aria-hidden />
        ) : (
          <IconPlus size={20} stroke={2.4} aria-hidden />
        )}
        {t(job ? "jobs.form.update" : "jobs.form.add")}
      </Button>
    </form>
  );
}
