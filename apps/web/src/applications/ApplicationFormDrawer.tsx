import type { Application } from "@appligator/shared";
import { Drawer, Field, TextInput, useSuccessToast, useFocusFirstError } from "@appligator/ui";
import { IconPencil } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { DetailsFields } from "../details/DetailsFields.tsx";
import { NotesField } from "../details/NotesField.tsx";
import styles from "../details/form.module.css";
import { SubmitButton } from "../shortcuts/SubmitButton.tsx";
import {
  toApplicationFormValues,
  validateApplicationForm,
  type ApplicationFormErrors,
  type ApplicationFormValues,
} from "./applicationForm.ts";
import { useSaveApplication } from "./applicationQueries.ts";

interface ApplicationFormDrawerProps {
  application: Application;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicationFormDrawer({
  application,
  open,
  onOpenChange,
}: ApplicationFormDrawerProps) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();

  function handleSaved() {
    onOpenChange(false);
    showSuccess(t("applications.toast.updated"));
  }

  return (
    <Drawer
      title={t("applications.form.editTitle")}
      closeLabel={t("common.close")}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ApplicationForm application={application} onSaved={handleSaved} />
    </Drawer>
  );
}

interface ApplicationFormProps {
  application: Application;
  onSaved: () => void;
}

function ApplicationForm({ application, onSaved }: ApplicationFormProps) {
  const { t } = useTranslation();
  const save = useSaveApplication(application.id);
  const [values, setValues] = useState(() => toApplicationFormValues(application));
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const formRef = useFocusFirstError(errors);

  function update(changes: Partial<ApplicationFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  function errorFor(field: keyof ApplicationFormErrors) {
    const error = errors[field];
    return error && t(`fields.errors.${error}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateApplicationForm(values);
    setErrors(result.errors ?? {});
    if (result.input) save.mutate(result.input, { onSuccess: onSaved });
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={submit} noValidate>
      <Field label={t("fields.company")} error={errorFor("company")}>
        <TextInput value={values.company} onValueChange={(company) => update({ company })} />
      </Field>
      <Field label={t("fields.position")} error={errorFor("position")}>
        <TextInput value={values.position} onValueChange={(position) => update({ position })} />
      </Field>
      <DetailsFields values={values} onChange={update} errorFor={errorFor} />
      <NotesField
        value={values.notes}
        onValueChange={(notes) => update({ notes })}
        error={errorFor("notes")}
      />
      {save.isError && (
        <p role="alert" className={styles.saveError}>
          {t("applications.form.saveError")}
        </p>
      )}
      <SubmitButton icon={IconPencil} pending={save.isPending}>
        {t("applications.form.update")}
      </SubmitButton>
    </form>
  );
}
