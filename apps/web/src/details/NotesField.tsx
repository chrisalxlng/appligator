import { Field, RichTextEditor } from "@appligator/ui";
import { useTranslation } from "react-i18next";
import { useFormatLabels } from "./useFormatLabels.ts";

interface NotesFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
}

export function NotesField({ value, onValueChange, error }: NotesFieldProps) {
  const { t } = useTranslation();
  const formatLabels = useFormatLabels();

  return (
    <Field label={t("fields.notes")} error={error}>
      <RichTextEditor value={value} onValueChange={onValueChange} formatLabels={formatLabels} />
    </Field>
  );
}
