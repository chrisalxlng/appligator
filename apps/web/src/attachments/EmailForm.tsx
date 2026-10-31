import { activityLimits, type Attachment } from "@appligator/shared";
import {
  Button,
  DateInput,
  Field,
  RichTextEditor,
  submitKeyShortcuts,
  TextInput,
} from "@appligator/ui";
import { IconFileImport, IconPencil, IconPlus } from "@tabler/icons-react";
import { useRef, useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { richTextError, type FieldError } from "../details/detailsForm.ts";
import listStyles from "../details/list.module.css";
import { toIsoDateTime, toLocalDateTime } from "../details/localDateTime.ts";
import { useFormatLabels } from "../details/useFormatLabels.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { importEmail } from "./emailImport.ts";

type EmailAttachment = Extract<Attachment, { kind: "email" }>;

interface EmailFormValues {
  subject: string;
  from: string;
  sentAt: string;
  body: string;
}

function toFormValues(email?: Omit<EmailAttachment, "kind">): EmailFormValues {
  return {
    subject: email?.subject ?? "",
    from: email?.from ?? "",
    sentAt: email?.sentAt ? toLocalDateTime(email.sentAt) : "",
    body: email?.body ?? "",
  };
}

function headerError(text: string): FieldError | undefined {
  return text.length > activityLimits.emailHeaderLength ? "tooLong" : undefined;
}

interface EmailFormProps {
  inputRef: RefObject<HTMLInputElement | null>;
  attachment?: EmailAttachment;
  onSave: (attachment: EmailAttachment) => void;
}

export function EmailForm({ inputRef, attachment, onSave }: EmailFormProps) {
  const { t } = useTranslation();
  const formatLabels = useFormatLabels();
  const [values, setValues] = useState(() => toFormValues(attachment));
  const [errors, setErrors] = useState<Partial<Record<keyof EmailFormValues, FieldError>>>({});
  const [importFailed, setImportFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shortcutHints = useShortcutHints();

  function setValue(key: keyof EmailFormValues) {
    return (value: string) => setValues((current) => ({ ...current, [key]: value }));
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImportFailed(false);
    try {
      setValues(toFormValues(await importEmail(file)));
    } catch {
      setImportFailed(true);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    // The drawer is portaled, but React still bubbles the submit to the surrounding activity form.
    event.stopPropagation();
    const subject = values.subject.trim();
    const from = values.from.trim();
    const nextErrors = {
      subject: headerError(subject),
      from: headerError(from),
      body: richTextError(values.body, activityLimits.emailBodyLength),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    onSave({
      kind: "email",
      subject,
      from,
      sentAt: values.sentAt ? toIsoDateTime(values.sentAt) : null,
      body: values.body,
    });
  }

  function errorFor(field: keyof EmailFormValues) {
    const error = errors[field];
    return error && t(`fields.errors.${error}`);
  }

  return (
    <form className={listStyles.form} onSubmit={submit} noValidate>
      <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
        <IconFileImport size={20} stroke={2.4} aria-hidden />
        {t("attachments.email.import")}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".eml,message/rfc822"
        hidden
        aria-label={t("attachments.email.import")}
        onChange={(event) => {
          void importFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {importFailed && (
        <p role="alert" className={listStyles.error}>
          {t("attachments.errors.importFailed")}
        </p>
      )}
      <Field label={t("attachments.email.subject")} error={errorFor("subject")}>
        <TextInput ref={inputRef} value={values.subject} onValueChange={setValue("subject")} />
      </Field>
      <Field label={t("attachments.email.from")} error={errorFor("from")}>
        <TextInput type="email" value={values.from} onValueChange={setValue("from")} />
      </Field>
      <Field label={t("attachments.email.sentAt")}>
        <DateInput
          value={values.sentAt}
          onValueChange={setValue("sentAt")}
          withTime
          clearable
          clearLabel={t("fields.clear")}
        />
      </Field>
      <Field label={t("attachments.email.body")} error={errorFor("body")}>
        <RichTextEditor
          value={values.body}
          onValueChange={setValue("body")}
          formatLabels={formatLabels}
        />
      </Field>
      <Button
        type="submit"
        shortcutHint={shortcutHints?.submit}
        aria-keyshortcuts={submitKeyShortcuts}
      >
        {attachment ? (
          <IconPencil size={20} stroke={2.4} aria-hidden />
        ) : (
          <IconPlus size={20} stroke={2.4} aria-hidden />
        )}
        {t(attachment ? "attachments.update" : "attachments.add")}
      </Button>
    </form>
  );
}
