import { activityLimits, jobLimits, type Attachment } from "@appligator/shared";
import {
  Button,
  Drawer,
  Field,
  Fieldset,
  IconButton,
  submitKeyShortcuts,
  TextInput,
} from "@appligator/ui";
import { IconPencil, IconPlus, IconTrash, IconWorld } from "@tabler/icons-react";
import { useRef, useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { hostname } from "../details/format.ts";
import listStyles from "../details/TextList.module.css";
import { parseLink } from "../jobs/jobForm.ts";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import styles from "./AttachmentList.module.css";

type LinkAttachment = Extract<Attachment, { kind: "link" }>;

interface AttachmentListProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

export function attachmentTitle(attachment: Attachment) {
  return attachment.title || hostname(attachment.url);
}

export function AttachmentList({ attachments, onChange }: AttachmentListProps) {
  const { t } = useTranslation();
  const [drawer, setDrawer] = useState<{ open: boolean; index: number | null }>({
    open: false,
    index: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const editedAttachment = drawer.index === null ? undefined : attachments[drawer.index];

  function save(attachment: LinkAttachment) {
    onChange(
      drawer.index === null
        ? [...attachments, attachment]
        : attachments.map((current, index) => (index === drawer.index ? attachment : current)),
    );
    setDrawer((current) => ({ ...current, open: false }));
  }

  return (
    <Fieldset legend={t("activities.attachments.legend")}>
      {attachments.length > 0 && (
        <ul className={listStyles.list}>
          {attachments.map((attachment, index) => (
            <li key={`${index}-${attachment.url}`} className={listStyles.item}>
              <button
                type="button"
                className={`${listStyles.itemButton} ${styles.attachment}`}
                onClick={() => setDrawer({ open: true, index })}
              >
                <IconWorld size={20} stroke={2} aria-hidden />
                <span className={styles.text}>
                  <span>{attachmentTitle(attachment)}</span>
                  <span className={styles.meta}>{hostname(attachment.url)}</span>
                </span>
              </button>
              <IconButton
                variant="surface"
                label={t("activities.attachments.remove", { title: attachmentTitle(attachment) })}
                onClick={() => onChange(attachments.filter((_, current) => current !== index))}
              >
                <IconTrash size={20} stroke={2} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {attachments.length < activityLimits.attachments && (
        <button
          type="button"
          className={listStyles.addButton}
          aria-label={t("activities.attachments.addLink")}
          onClick={() => setDrawer({ open: true, index: null })}
        >
          <IconPlus size={20} stroke={2.4} aria-hidden />
          {t("activities.attachments.add")}
        </button>
      )}
      <Drawer
        title={t(
          editedAttachment ? "activities.attachments.editLink" : "activities.attachments.addLink",
        )}
        closeLabel={t("common.close")}
        open={drawer.open}
        onOpenChange={(open) => setDrawer((current) => ({ ...current, open }))}
        initialFocus={inputRef}
      >
        <LinkForm inputRef={inputRef} attachment={editedAttachment} onSave={save} />
      </Drawer>
    </Fieldset>
  );
}

interface LinkFormProps {
  inputRef: RefObject<HTMLInputElement | null>;
  attachment?: LinkAttachment;
  onSave: (attachment: LinkAttachment) => void;
}

function LinkForm({ inputRef, attachment, onSave }: LinkFormProps) {
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
      url: link ? undefined : t("activities.attachments.errors.urlInvalid"),
      title:
        trimmedTitle.length > jobLimits.textLength
          ? t("activities.attachments.errors.tooLong")
          : undefined,
    };
    setErrors(nextErrors);
    if (link && !nextErrors.title) onSave({ kind: "link", url: link, title: trimmedTitle });
  }

  return (
    <form className={listStyles.form} onSubmit={submit} noValidate>
      <Field label={t("activities.attachments.url")} error={errors.url}>
        <TextInput ref={inputRef} type="url" value={url} onValueChange={setUrl} />
      </Field>
      <Field label={t("activities.attachments.title")} error={errors.title}>
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
        {t(attachment ? "activities.form.update" : "activities.form.add")}
      </Button>
    </form>
  );
}
