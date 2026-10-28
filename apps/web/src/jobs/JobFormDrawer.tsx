import {
  currencies,
  employmentTypes,
  salaryPeriods,
  workModels,
  type Job,
} from "@appligator/shared";
import {
  Button,
  DateInput,
  Drawer,
  Field,
  Fieldset,
  NumberInput,
  RichTextEditor,
  Select,
  submitKeyShortcuts,
  TextInput,
  useSuccessToast,
} from "@appligator/ui";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useRef, useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { useSaveJob } from "./jobQueries.ts";
import {
  toFormValues,
  validateJobForm,
  type JobFormErrors,
  type JobFormValues,
} from "./jobForm.ts";
import styles from "./JobFormDrawer.module.css";
import { LocationList } from "./LocationList.tsx";

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
      closeLabel={t("jobs.close")}
      open={open}
      onOpenChange={onOpenChange}
      initialFocus={job ? undefined : firstFieldRef}
    >
      <JobForm job={job} firstFieldRef={firstFieldRef} onSaved={handleSaved} />
    </Drawer>
  );
}

function useFormatLabels() {
  const { t } = useTranslation();
  return {
    bold: t("jobs.format.bold"),
    italic: t("jobs.format.italic"),
    heading: t("jobs.format.heading"),
    bulletList: t("jobs.format.bulletList"),
    orderedList: t("jobs.format.orderedList"),
  };
}

interface JobFormProps {
  job?: Job;
  firstFieldRef: RefObject<HTMLInputElement | null>;
  onSaved: (job: Job) => void;
}

function JobForm({ job, firstFieldRef, onSaved }: JobFormProps) {
  const { t, i18n } = useTranslation();
  const formatLabels = useFormatLabels();
  const save = useSaveJob(job?.id);
  const [values, setValues] = useState(() => toFormValues(job));
  const [errors, setErrors] = useState<JobFormErrors>({});
  const shortcutHints = useShortcutHints();

  function setValue<Key extends keyof JobFormValues>(key: Key) {
    return (value: JobFormValues[Key]) => setValues((current) => ({ ...current, [key]: value }));
  }

  function errorFor(field: keyof JobFormErrors) {
    const error = errors[field];
    return error && t(`jobs.form.errors.${error}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateJobForm(values);
    setErrors(result.errors ?? {});
    if (result.input) save.mutate(result.input, { onSuccess: onSaved });
  }

  const selectPlaceholder = t("jobs.form.selectPlaceholder");
  const clearLabel = t("jobs.form.clear");

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field label={t("jobs.form.link")} error={errorFor("link")}>
        <TextInput
          ref={firstFieldRef}
          type="url"
          value={values.link}
          onValueChange={setValue("link")}
        />
      </Field>
      <Field label={t("jobs.form.description")}>
        <RichTextEditor
          value={values.description}
          onValueChange={setValue("description")}
          formatLabels={formatLabels}
        />
      </Field>
      <Field label={t("jobs.form.summary")}>
        <RichTextEditor
          value={values.summary}
          onValueChange={setValue("summary")}
          formatLabels={formatLabels}
        />
      </Field>
      <Field label={t("jobs.form.company")} error={errorFor("company")}>
        <TextInput value={values.company} onValueChange={setValue("company")} />
      </Field>
      <Field label={t("jobs.form.position")} error={errorFor("position")}>
        <TextInput value={values.position} onValueChange={setValue("position")} />
      </Field>
      <Fieldset legend={t("jobs.form.salary")} error={errorFor("salary")}>
        <div className={styles.salaryRange}>
          <Select
            aria-label={t("jobs.form.currency")}
            items={currencies.map((currency) => ({ value: currency, label: currency }))}
            value={values.salaryCurrency}
            onValueChange={setValue("salaryCurrency")}
            placeholder={selectPlaceholder}
            clearable
            clearLabel={clearLabel}
          />
          <NumberInput
            aria-label={t("jobs.form.salaryMin")}
            locale={i18n.language}
            min={0}
            value={values.salaryMin}
            onValueChange={setValue("salaryMin")}
          />
          <span aria-hidden>{t("jobs.form.salaryTo")}</span>
          <NumberInput
            aria-label={t("jobs.form.salaryMax")}
            locale={i18n.language}
            min={0}
            value={values.salaryMax}
            onValueChange={setValue("salaryMax")}
          />
        </div>
        <Select
          aria-label={t("jobs.form.salaryPeriod")}
          items={salaryPeriods.map((period) => ({
            value: period,
            label: t(`jobs.salaryPeriod.${period}`),
          }))}
          value={values.salaryPeriod}
          onValueChange={setValue("salaryPeriod")}
          placeholder={selectPlaceholder}
          clearable
          clearLabel={clearLabel}
        />
      </Fieldset>
      <LocationList locations={values.locations} onChange={setValue("locations")} />
      <Field label={t("jobs.form.workModel")}>
        <Select
          items={workModels.map((workModel) => ({
            value: workModel,
            label: t(`jobs.workModel.${workModel}`),
          }))}
          value={values.workModel}
          onValueChange={setValue("workModel")}
          placeholder={selectPlaceholder}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
      <Field label={t("jobs.form.employmentType")}>
        <Select
          items={employmentTypes.map((employmentType) => ({
            value: employmentType,
            label: t(`jobs.employmentType.${employmentType}`),
          }))}
          value={values.employmentType}
          onValueChange={setValue("employmentType")}
          placeholder={selectPlaceholder}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
      <Field label={t("jobs.form.applicationDeadline")}>
        <DateInput
          value={values.applicationDeadline}
          onValueChange={setValue("applicationDeadline")}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
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
