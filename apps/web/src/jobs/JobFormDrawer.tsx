import {
  companyTypes,
  contractTermKinds,
  currencies,
  employmentTypes,
  jobLimits,
  maxNoticePeriod,
  noticePeriodEnds,
  noticePeriodUnits,
  salaryPeriods,
  workingHoursPeriods,
  workModels,
  type Job,
  type JobExtraction,
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
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { JobAnalysisStatus } from "./JobAnalysisStatus.tsx";
import { useSaveJob } from "./jobQueries.ts";
import {
  fillEmptyFields,
  toFormValues,
  validateJobForm,
  type JobFormErrors,
  type JobFormValues,
} from "./jobForm.ts";
import styles from "./JobFormDrawer.module.css";
import { TextList } from "./TextList.tsx";
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

function unitFormat(unit: string, unitDisplay: "short" | "long" = "short") {
  return { style: "unit", unit, unitDisplay } as const;
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
  const valuesRef = useRef(values);
  const { analysis, analyzePaste, retry, dismiss } = useJobAnalysis(applyExtraction);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  function applyExtraction(extraction: JobExtraction) {
    const filled = fillEmptyFields(valuesRef.current, extraction);
    setValues(filled.values);
    return filled.filledFields;
  }

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
      <Field label={t("jobs.form.description")} error={errorFor("description")}>
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
      <Field label={t("jobs.form.summary")} error={errorFor("summary")}>
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
      <Field label={t("jobs.form.applicationDeadline")}>
        <DateInput
          value={values.applicationDeadline}
          onValueChange={setValue("applicationDeadline")}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
      <Fieldset legend={t("jobs.form.companySize")}>
        <div className={styles.pair}>
          <Select
            aria-label={t("jobs.form.companyType")}
            items={companyTypes.map((companyType) => ({
              value: companyType,
              label: t(`jobs.companyType.${companyType}`),
            }))}
            value={values.companyType}
            onValueChange={setValue("companyType")}
            placeholder={t("jobs.form.companyType")}
            clearable
            clearLabel={clearLabel}
          />
          <NumberInput
            aria-label={t("jobs.form.employeeCount")}
            placeholder={t("jobs.form.employeeCount")}
            locale={i18n.language}
            min={1}
            max={jobLimits.employeeCount}
            value={values.employeeCount}
            onValueChange={setValue("employeeCount")}
          />
        </div>
      </Fieldset>
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
      <TextList
        kind="bonus"
        legend={t("jobs.form.bonuses")}
        items={values.bonuses}
        onChange={setValue("bonuses")}
      />
      <TextList
        kind="benefit"
        legend={t("jobs.form.benefits")}
        items={values.benefits}
        onChange={setValue("benefits")}
      />
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
      <Field label={t("jobs.form.homeOfficePercentage")}>
        <NumberInput
          locale={i18n.language}
          format={unitFormat("percent")}
          min={0}
          max={100}
          value={values.homeOfficePercentage}
          onValueChange={setValue("homeOfficePercentage")}
        />
      </Field>
      <Fieldset legend={t("jobs.form.workingHours")}>
        <div className={styles.pair}>
          <NumberInput
            aria-label={t("jobs.form.workingHours")}
            locale={i18n.language}
            format={{ ...unitFormat("hour"), maximumFractionDigits: 2 }}
            min={0}
            max={jobLimits.workingHours}
            value={values.workingHours}
            onValueChange={setValue("workingHours")}
          />
          <Select
            aria-label={t("jobs.form.workingHoursPeriod")}
            items={workingHoursPeriods.map((period) => ({
              value: period,
              label: t(`jobs.workingHoursPeriod.${period}`),
            }))}
            value={values.workingHoursPeriod}
            onValueChange={(period) => period && setValue("workingHoursPeriod")(period)}
            placeholder={selectPlaceholder}
          />
        </div>
      </Fieldset>
      <TextList
        kind="location"
        legend={t("jobs.form.locations")}
        items={values.locations}
        onChange={setValue("locations")}
      />
      <Fieldset legend={t("jobs.form.commute")}>
        <div className={styles.pair}>
          <NumberInput
            aria-label={t("jobs.form.commuteDistance")}
            locale={i18n.language}
            format={unitFormat("kilometer")}
            min={0}
            max={jobLimits.commuteDistance}
            value={values.commuteDistance}
            onValueChange={setValue("commuteDistance")}
          />
          <NumberInput
            aria-label={t("jobs.form.commuteDuration")}
            locale={i18n.language}
            format={unitFormat("minute")}
            min={0}
            max={jobLimits.commuteDuration}
            value={values.commuteDuration}
            onValueChange={setValue("commuteDuration")}
          />
        </div>
      </Fieldset>
      <Field label={t("jobs.form.vacationDays")} error={errorFor("vacationDays")}>
        <NumberInput
          locale={i18n.language}
          format={{ maximumFractionDigits: 1 }}
          min={0}
          max={jobLimits.vacationDays}
          value={values.vacationDays}
          onValueChange={setValue("vacationDays")}
        />
      </Field>
      <Field label={t("jobs.form.startDate")}>
        <DateInput
          value={values.startDate}
          onValueChange={setValue("startDate")}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
      <Fieldset legend={t("jobs.form.contractTerm")} error={errorFor("contractTerm")}>
        <Select
          aria-label={t("jobs.form.contractTerm")}
          items={contractTermKinds.map((kind) => ({
            value: kind,
            label: t(`jobs.contractTermKind.${kind}`),
          }))}
          value={values.contractTermKind}
          onValueChange={setValue("contractTermKind")}
          placeholder={selectPlaceholder}
          clearable
          clearLabel={clearLabel}
        />
        {values.contractTermKind === "months" && (
          <NumberInput
            aria-label={t("jobs.form.contractTermMonths")}
            locale={i18n.language}
            format={unitFormat("month", "long")}
            min={1}
            max={jobLimits.months}
            value={values.contractTermMonths}
            onValueChange={setValue("contractTermMonths")}
          />
        )}
        {values.contractTermKind === "until" && (
          <DateInput
            aria-label={t("jobs.form.contractTermDate")}
            value={values.contractTermDate}
            onValueChange={setValue("contractTermDate")}
            clearable
            clearLabel={clearLabel}
          />
        )}
      </Fieldset>
      <Field label={t("jobs.form.probationMonths")}>
        <NumberInput
          locale={i18n.language}
          format={unitFormat("month", "long")}
          min={0}
          max={jobLimits.months}
          value={values.probationMonths}
          onValueChange={setValue("probationMonths")}
        />
      </Field>
      <Fieldset legend={t("jobs.form.noticePeriod")} error={errorFor("noticePeriod")}>
        <div className={styles.pair}>
          <NumberInput
            aria-label={t("jobs.form.noticePeriodAmount")}
            locale={i18n.language}
            min={1}
            max={maxNoticePeriod(values.noticePeriodUnit)}
            value={values.noticePeriodAmount}
            onValueChange={setValue("noticePeriodAmount")}
          />
          <Select
            aria-label={t("jobs.form.noticePeriodUnit")}
            items={noticePeriodUnits.map((unit) => ({
              value: unit,
              label: t(`jobs.noticePeriodUnit.${unit}`),
            }))}
            value={values.noticePeriodUnit}
            onValueChange={(unit) => unit && setValue("noticePeriodUnit")(unit)}
            placeholder={selectPlaceholder}
          />
        </div>
        <Select
          aria-label={t("jobs.form.noticePeriodEndOf")}
          items={noticePeriodEnds.map((end) => ({
            value: end,
            label: t(`jobs.noticePeriodEnd.${end}`),
          }))}
          value={values.noticePeriodEndOf}
          onValueChange={setValue("noticePeriodEndOf")}
          placeholder={t("jobs.form.noticePeriodWithoutEnd")}
          clearable
          clearLabel={clearLabel}
        />
      </Fieldset>
      <Field label={t("jobs.form.notes")} error={errorFor("notes")}>
        <RichTextEditor
          value={values.notes}
          onValueChange={setValue("notes")}
          formatLabels={formatLabels}
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
