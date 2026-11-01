import { jobLimits } from "@appligator/shared";
import { Field, TextInput, useFocusFirstError } from "@appligator/ui";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import formStyles from "../details/form.module.css";
import { parseLink } from "../details/parseLink.ts";
import { SubmitButton } from "../shortcuts/SubmitButton.tsx";
import type { LinkAttachment } from "./attachments.ts";

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
  const formRef = useFocusFirstError(errors);

  function submit(event: FormEvent) {
    event.preventDefault();
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
    <form ref={formRef} className={formStyles.form} onSubmit={submit} noValidate>
      <Field label={t("attachments.link.url")} error={errors.url}>
        <TextInput ref={inputRef} type="url" value={url} onValueChange={setUrl} />
      </Field>
      <Field label={t("attachments.link.title")} error={errors.title}>
        <TextInput value={title} onValueChange={setTitle} />
      </Field>
      <SubmitButton icon={attachment ? IconPencil : IconPlus}>
        {t(attachment ? "attachments.update" : "attachments.add")}
      </SubmitButton>
    </form>
  );
}
