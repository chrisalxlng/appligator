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
} from "@appligator/shared";
import { DateInput, Field, Fieldset, NumberInput, Select } from "@appligator/ui";
import { useTranslation } from "react-i18next";
import type { DetailsFormErrors, DetailsFormValues } from "./detailsForm.ts";
import styles from "./form.module.css";
import { TextList } from "./TextList.tsx";

function unitFormat(unit: string, unitDisplay: "short" | "long" = "short") {
  return { style: "unit", unit, unitDisplay } as const;
}

interface DetailsFieldsProps {
  values: DetailsFormValues;
  onChange: (changes: Partial<DetailsFormValues>) => void;
  errorFor: (field: keyof DetailsFormErrors) => string | undefined;
}

export function DetailsFields({ values, onChange, errorFor }: DetailsFieldsProps) {
  const { t, i18n } = useTranslation();

  function setValue<Key extends keyof DetailsFormValues>(key: Key) {
    return (value: DetailsFormValues[Key]) =>
      onChange({ [key]: value } as Pick<DetailsFormValues, Key>);
  }
  const selectPlaceholder = t("fields.selectPlaceholder");
  const clearLabel = t("fields.clear");

  return (
    <>
      <Fieldset legend={t("fields.companySize")}>
        <div className={styles.pair}>
          <Select
            aria-label={t("fields.companyType")}
            items={companyTypes.map((companyType) => ({
              value: companyType,
              label: t(`details.companyType.${companyType}`),
            }))}
            value={values.companyType}
            onValueChange={setValue("companyType")}
            placeholder={t("fields.companyType")}
            clearable
            clearLabel={clearLabel}
          />
          <NumberInput
            aria-label={t("fields.employeeCount")}
            placeholder={t("fields.employeeCount")}
            locale={i18n.language}
            min={1}
            max={jobLimits.employeeCount}
            value={values.employeeCount}
            onValueChange={setValue("employeeCount")}
          />
        </div>
      </Fieldset>
      <Fieldset legend={t("fields.salary")} error={errorFor("salary")}>
        <div className={styles.salaryRange}>
          <Select
            aria-label={t("fields.currency")}
            items={currencies.map((currency) => ({ value: currency, label: currency }))}
            value={values.salaryCurrency}
            onValueChange={setValue("salaryCurrency")}
            placeholder={selectPlaceholder}
            clearable
            clearLabel={clearLabel}
          />
          <NumberInput
            aria-label={t("fields.salaryMin")}
            locale={i18n.language}
            min={0}
            value={values.salaryMin}
            onValueChange={setValue("salaryMin")}
          />
          <span aria-hidden>{t("fields.salaryTo")}</span>
          <NumberInput
            aria-label={t("fields.salaryMax")}
            locale={i18n.language}
            min={0}
            value={values.salaryMax}
            onValueChange={setValue("salaryMax")}
          />
        </div>
        <Select
          aria-label={t("fields.salaryPeriod")}
          items={salaryPeriods.map((period) => ({
            value: period,
            label: t(`details.salaryPeriod.${period}`),
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
        legend={t("fields.bonuses")}
        items={values.bonuses}
        onChange={setValue("bonuses")}
      />
      <TextList
        kind="benefit"
        legend={t("fields.benefits")}
        items={values.benefits}
        onChange={setValue("benefits")}
      />
      <Field label={t("fields.employmentType")}>
        <Select
          items={employmentTypes.map((employmentType) => ({
            value: employmentType,
            label: t(`details.employmentType.${employmentType}`),
          }))}
          value={values.employmentType}
          onValueChange={setValue("employmentType")}
          placeholder={selectPlaceholder}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
      <Field label={t("fields.workModel")}>
        <Select
          items={workModels.map((workModel) => ({
            value: workModel,
            label: t(`details.workModel.${workModel}`),
          }))}
          value={values.workModel}
          onValueChange={setValue("workModel")}
          placeholder={selectPlaceholder}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
      <Field label={t("fields.homeOfficePercentage")}>
        <NumberInput
          locale={i18n.language}
          format={unitFormat("percent")}
          min={0}
          max={100}
          value={values.homeOfficePercentage}
          onValueChange={setValue("homeOfficePercentage")}
        />
      </Field>
      <Fieldset legend={t("fields.workingHours")} error={errorFor("workingHours")}>
        <div className={styles.pair}>
          <NumberInput
            aria-label={t("fields.workingHours")}
            locale={i18n.language}
            format={{ ...unitFormat("hour"), maximumFractionDigits: 2 }}
            min={0}
            max={jobLimits.workingHours}
            value={values.workingHours}
            onValueChange={setValue("workingHours")}
          />
          <Select
            aria-label={t("fields.workingHoursPeriod")}
            items={workingHoursPeriods.map((period) => ({
              value: period,
              label: t(`details.workingHoursPeriod.${period}`),
            }))}
            value={values.workingHoursPeriod}
            onValueChange={(period) => period && setValue("workingHoursPeriod")(period)}
            placeholder={selectPlaceholder}
          />
        </div>
      </Fieldset>
      <TextList
        kind="location"
        legend={t("fields.locations")}
        items={values.locations}
        onChange={setValue("locations")}
      />
      <Fieldset legend={t("fields.commute")}>
        <div className={styles.pair}>
          <NumberInput
            aria-label={t("fields.commuteDistance")}
            locale={i18n.language}
            format={unitFormat("kilometer")}
            min={0}
            max={jobLimits.commuteDistance}
            value={values.commuteDistance}
            onValueChange={setValue("commuteDistance")}
          />
          <NumberInput
            aria-label={t("fields.commuteDuration")}
            locale={i18n.language}
            format={unitFormat("minute")}
            min={0}
            max={jobLimits.commuteDuration}
            value={values.commuteDuration}
            onValueChange={setValue("commuteDuration")}
          />
        </div>
      </Fieldset>
      <Field label={t("fields.vacationDays")} error={errorFor("vacationDays")}>
        <NumberInput
          locale={i18n.language}
          format={{ maximumFractionDigits: 1 }}
          min={0}
          max={jobLimits.vacationDays}
          value={values.vacationDays}
          onValueChange={setValue("vacationDays")}
        />
      </Field>
      <Field label={t("fields.startDate")}>
        <DateInput
          value={values.startDate}
          onValueChange={setValue("startDate")}
          clearable
          clearLabel={clearLabel}
        />
      </Field>
      <Fieldset legend={t("fields.contractTerm")} error={errorFor("contractTerm")}>
        <Select
          aria-label={t("fields.contractTerm")}
          items={contractTermKinds.map((kind) => ({
            value: kind,
            label: t(`details.contractTermKind.${kind}`),
          }))}
          value={values.contractTermKind}
          onValueChange={setValue("contractTermKind")}
          placeholder={selectPlaceholder}
          clearable
          clearLabel={clearLabel}
        />
        {values.contractTermKind === "months" && (
          <NumberInput
            aria-label={t("fields.contractTermMonths")}
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
            aria-label={t("fields.contractTermDate")}
            value={values.contractTermDate}
            onValueChange={setValue("contractTermDate")}
            clearable
            clearLabel={clearLabel}
          />
        )}
      </Fieldset>
      <Field label={t("fields.probationMonths")}>
        <NumberInput
          locale={i18n.language}
          format={unitFormat("month", "long")}
          min={0}
          max={jobLimits.months}
          value={values.probationMonths}
          onValueChange={setValue("probationMonths")}
        />
      </Field>
      <Fieldset legend={t("fields.noticePeriod")} error={errorFor("noticePeriod")}>
        <div className={styles.pair}>
          <NumberInput
            aria-label={t("fields.noticePeriodAmount")}
            locale={i18n.language}
            min={1}
            max={maxNoticePeriod(values.noticePeriodUnit)}
            value={values.noticePeriodAmount}
            onValueChange={setValue("noticePeriodAmount")}
          />
          <Select
            aria-label={t("fields.noticePeriodUnit")}
            items={noticePeriodUnits.map((unit) => ({
              value: unit,
              label: t(`details.noticePeriodUnit.${unit}`),
            }))}
            value={values.noticePeriodUnit}
            onValueChange={(unit) => unit && setValue("noticePeriodUnit")(unit)}
            placeholder={selectPlaceholder}
          />
        </div>
        <Select
          aria-label={t("fields.noticePeriodEndOf")}
          items={noticePeriodEnds.map((end) => ({
            value: end,
            label: t(`details.noticePeriodEnd.${end}`),
          }))}
          value={values.noticePeriodEndOf}
          onValueChange={setValue("noticePeriodEndOf")}
          placeholder={t("fields.noticePeriodWithoutEnd")}
          clearable
          clearLabel={clearLabel}
        />
      </Fieldset>
    </>
  );
}
