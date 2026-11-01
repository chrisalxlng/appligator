import type { ActivityTerms } from "@appligator/shared";
import { Drawer, Field, Fieldset, IconButton, TextInput, useFocusFirstError } from "@appligator/ui";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import a11y from "../styles/visuallyHidden.module.css";
import { DetailsFields } from "../details/DetailsFields.tsx";
import { useDetails } from "../details/DetailsSection.tsx";
import formStyles from "../details/form.module.css";
import listStyles from "../details/list.module.css";
import { SubmitButton } from "../shortcuts/SubmitButton.tsx";
import {
  toTermsFormValues,
  validateTermsForm,
  type TermsFormErrors,
  type TermsFormValues,
} from "./activityFormValues.ts";

interface TermsFieldProps {
  terms: ActivityTerms | null;
  onChange: (terms: ActivityTerms | null) => void;
}

export function TermsField({ terms, onChange }: TermsFieldProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const details = useDetails(terms && { ...terms, notes: "" });

  function save(changedTerms: ActivityTerms | null) {
    onChange(changedTerms);
    setIsEditing(false);
  }

  return (
    <Fieldset legend={t("activities.terms.legend")}>
      {terms ? (
        <div className={listStyles.item}>
          <button
            type="button"
            className={listStyles.itemButton}
            onClick={() => setIsEditing(true)}
          >
            <span className={listStyles.itemText}>
              <span>{terms.position ?? t("activities.terms.legend")}</span>
              {details.length > 0 && (
                <span className={listStyles.itemMeta}>
                  {details.map(({ label }) => label).join(", ")}
                </span>
              )}
            </span>
            <span className={a11y.visuallyHidden}>{t("activities.terms.editTitle")}</span>
          </button>
          <IconButton
            variant="surface"
            className={listStyles.itemAction}
            label={t("activities.terms.remove")}
            onClick={() => onChange(null)}
          >
            <IconTrash size={20} stroke={2} aria-hidden />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          className={listStyles.addButton}
          aria-label={t("activities.terms.addTitle")}
          onClick={() => setIsEditing(true)}
        >
          <IconPlus size={20} stroke={2.4} aria-hidden />
          {t("activities.terms.add")}
        </button>
      )}
      <Drawer
        title={t(terms ? "activities.terms.editTitle" : "activities.terms.addTitle")}
        closeLabel={t("common.close")}
        open={isEditing}
        onOpenChange={setIsEditing}
      >
        <TermsForm terms={terms} onSave={save} />
      </Drawer>
    </Fieldset>
  );
}

interface TermsFormProps {
  terms: ActivityTerms | null;
  onSave: (terms: ActivityTerms | null) => void;
}

function TermsForm({ terms, onSave }: TermsFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => toTermsFormValues(terms));
  const [errors, setErrors] = useState<TermsFormErrors>({});
  const formRef = useFocusFirstError(errors);

  function update(changes: Partial<TermsFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  function errorFor(field: keyof TermsFormErrors) {
    const error = errors[field];
    return error && t(`fields.errors.${error}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateTermsForm(values);
    setErrors(result.errors ?? {});
    if (!result.errors) onSave(result.terms);
  }

  return (
    <form ref={formRef} className={formStyles.form} onSubmit={submit} noValidate>
      <Field label={t("fields.position")} error={errorFor("position")}>
        <TextInput value={values.position} onValueChange={(position) => update({ position })} />
      </Field>
      <DetailsFields values={values} onChange={update} errorFor={errorFor} />
      <SubmitButton icon={terms ? IconPencil : IconPlus}>
        {t(terms ? "activities.form.update" : "activities.form.add")}
      </SubmitButton>
    </form>
  );
}
