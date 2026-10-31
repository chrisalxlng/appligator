import { activityLimits, type Attachment } from "@appligator/shared";
import {
  Button,
  DateInput,
  Field,
  RichTextEditor,
  submitKeyShortcuts,
  TextInput,
} from "@appligator/ui";
import { IconPencil, IconPlus, IconUpload } from "@tabler/icons-react";
import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { richTextError, type FieldError } from "../details/detailsForm.ts";
import listStyles from "../details/list.module.css";
import { toIsoDateTime, toLocalDateTime } from "../details/localDateTime.ts";
import { useFormatLabels } from "../details/useFormatLabels.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import { DropZone } from "./DropZone.tsx";
import styles from "./EmailForm.module.css";
import { importEmail, isEmailFile } from "./emailImport.ts";

type EmailAttachment = Extract<Attachment, { kind: "email" }>;
type LinkAttachment = Extract<Attachment, { kind: "link" }>;

interface EmailFormValues {
  subject: string;
  from: string;
  to: string;
  sentAt: string;
  body: string;
}

function toFormValues(email?: Omit<EmailAttachment, "kind">): EmailFormValues {
  return {
    subject: email?.subject ?? "",
    from: email?.from.toLowerCase() ?? "",
    to: email?.to.toLowerCase() ?? "",
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
  onSave: (attachment: EmailAttachment, links: LinkAttachment[]) => void;
}

export function EmailForm({ inputRef, attachment, onSave }: EmailFormProps) {
  const { t } = useTranslation();
  const formatLabels = useFormatLabels();
  const [values, setValues] = useState(() => toFormValues(attachment));
  const [errors, setErrors] = useState<Partial<Record<keyof EmailFormValues, FieldError>>>({});
  const [importError, setImportError] = useState<"importFailed" | "notAnEmail">();
  const [links, setLinks] = useState<LinkAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importHintId = useId();
  const shortcutHints = useShortcutHints();

  function setValue(key: keyof EmailFormValues) {
    return (value: string) => setValues((current) => ({ ...current, [key]: value }));
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    if (!isEmailFile(file)) return setImportError("notAnEmail");
    setImportError(undefined);
    try {
      const imported = await importEmail(file);
      setValues(toFormValues(imported.email));
      setLinks(imported.links);
    } catch {
      setImportError("importFailed");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    // The drawer is portaled, but React still bubbles the submit to the surrounding activity form.
    event.stopPropagation();
    const subject = values.subject.trim();
    const from = values.from.trim();
    const to = values.to.trim();
    const nextErrors = {
      subject: headerError(subject),
      from: headerError(from),
      to: headerError(to),
      body: richTextError(values.body, activityLimits.emailBodyLength),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    onSave(
      {
        kind: "email",
        subject,
        from,
        to,
        sentAt: values.sentAt ? toIsoDateTime(values.sentAt) : null,
        body: values.body,
      },
      links,
    );
  }

  function errorFor(field: keyof EmailFormValues) {
    const error = errors[field];
    return error && t(`fields.errors.${error}`);
  }

  return (
    <DropZone
      label={t("attachments.email.dropHere")}
      onFiles={(files) => void importFile(files[0])}
    >
      <form className={listStyles.form} onSubmit={submit} noValidate>
        <div className={styles.import}>
          <Button
            type="button"
            variant="secondary"
            aria-describedby={importHintId}
            onClick={() => fileInputRef.current?.click()}
          >
            <IconUpload size={20} stroke={2.4} aria-hidden />
            {t("attachments.email.import")}
          </Button>
          <p id={importHintId} className={styles.importHint}>
            {t("attachments.email.importFormat")}
          </p>
        </div>
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
        {importError && (
          <p role="alert" className={listStyles.error}>
            {t(`attachments.errors.${importError}`)}
          </p>
        )}
        <Field label={t("attachments.email.subject")} error={errorFor("subject")}>
          <TextInput ref={inputRef} value={values.subject} onValueChange={setValue("subject")} />
        </Field>
        <Field label={t("attachments.email.from")} error={errorFor("from")}>
          <TextInput
            type="email"
            value={values.from}
            onValueChange={(from) => setValue("from")(from.toLowerCase())}
          />
        </Field>
        <Field label={t("attachments.email.to")} error={errorFor("to")}>
          <TextInput value={values.to} onValueChange={(to) => setValue("to")(to.toLowerCase())} />
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
    </DropZone>
  );
}
