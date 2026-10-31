import { jobLimits, type Attachment } from "@appligator/shared";
import { Button, Field, submitKeyShortcuts, TextInput } from "@appligator/ui";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import listStyles from "../details/list.module.css";
import { parseLink } from "../jobs/jobForm.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";

type LinkAttachment = Extract<Attachment, { kind: "link" }>;

interface LinkFormProps {
  inputRef: RefObject<HTMLInputElement | null>;
  attachment?: LinkAttachment;
  onSave: (attachment: LinkAttachment) => void;
}

export function LinkForm({ inputRef, attachment, onSave }: LinkFormProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(attachment?.url ?? "");
  const [title, setTitle] = useState(attachment?.title ?? "");
  const [errors, setErrors] = useState<{ url?: string; title?: string }>({});
  const shortcutHints = useShortcutHints();

  function submit(event: FormEvent) {
    event.preventDefault();
    // The drawer is portaled, but React still bubbles the submit to the surrounding activity form.
    event.stopPropagation();
    const link = parseLink(url);
    const trimmedTitle = title.trim();
    const nextErrors = {
      url: link ? undefined : t("attachments.link.errors.urlInvalid"),
      title:
        trimmedTitle.length > jobLimits.textLength
          ? t("attachments.link.errors.titleTooLong")
          : undefined,
    };
    setErrors(nextErrors);
    if (link && !nextErrors.title) onSave({ kind: "link", url: link, title: trimmedTitle });
  }

  return (
    <form className={listStyles.form} onSubmit={submit} noValidate>
      <Field label={t("attachments.link.url")} error={errors.url}>
        <TextInput ref={inputRef} type="url" value={url} onValueChange={setUrl} />
      </Field>
      <Field label={t("attachments.link.title")} error={errors.title}>
        <TextInput value={title} onValueChange={setTitle} />
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
