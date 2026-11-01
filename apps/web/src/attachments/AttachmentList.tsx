import { activityLimits, type Attachment } from "@appligator/shared";
import { Drawer, Fieldset, IconButton, Menu, MenuItem, SpinnerCircle } from "@appligator/ui";
import { IconFile, IconMail, IconPlus, IconTrash, IconWorld } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import a11y from "../styles/visuallyHidden.module.css";
import listStyles from "../details/list.module.css";
import { EmailForm } from "./EmailForm.tsx";
import { FileForm } from "./FileForm.tsx";
import { LinkForm } from "./LinkForm.tsx";
import type { AttachmentError } from "./useAddFiles.ts";
import { useDescribeAttachment } from "./useDescribeAttachment.ts";

type Kind = Attachment["kind"];

interface AttachmentListProps {
  attachments: Attachment[];
  uploads: { id: string; name: string }[];
  error?: AttachmentError;
  onChange: (update: (attachments: Attachment[]) => Attachment[]) => void;
}

export function AttachmentList({ attachments, uploads, error, onChange }: AttachmentListProps) {
  const { t } = useTranslation();
  const describe = useDescribeAttachment();
  const [drawer, setDrawer] = useState<{ open: boolean; kind: Kind; index: number | null }>({
    open: false,
    kind: "link",
    index: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const editedAttachment = drawer.index === null ? undefined : attachments[drawer.index];
  const remaining = activityLimits.attachments - attachments.length - uploads.length;

  function openDrawer(kind: Kind, index: number | null = null) {
    setDrawer({ open: true, kind, index });
  }

  function save(attachment: Attachment, links: Attachment[] = []) {
    onChange((current) => [
      ...(drawer.index === null
        ? [...current, attachment]
        : current.map((other, index) => (index === drawer.index ? attachment : other))),
      ...links,
    ]);
    setDrawer((current) => ({ ...current, open: false }));
  }

  function form() {
    switch (drawer.kind) {
      case "link":
        return (
          <LinkForm
            inputRef={inputRef}
            attachment={editedAttachment?.kind === "link" ? editedAttachment : undefined}
            onSave={save}
          />
        );
      case "email":
        return (
          <EmailForm
            inputRef={inputRef}
            attachment={editedAttachment?.kind === "email" ? editedAttachment : undefined}
            onSave={save}
          />
        );
      case "file":
        return (
          <FileForm
            titleRef={inputRef}
            attachment={editedAttachment?.kind === "file" ? editedAttachment : undefined}
            onSave={save}
          />
        );
    }
  }

  return (
    <Fieldset legend={t("attachments.legend")}>
      {(attachments.length > 0 || uploads.length > 0) && (
        <ul className={listStyles.list}>
          {attachments.map((attachment, index) => {
            const { icon: AttachmentIcon, title, meta } = describe(attachment);
            return (
              <li key={`${index}-${title}`} className={listStyles.item}>
                <button
                  type="button"
                  className={listStyles.itemButton}
                  onClick={() => openDrawer(attachment.kind, index)}
                >
                  <AttachmentIcon size={20} stroke={2} aria-hidden />
                  <span className={listStyles.itemText}>
                    <span>{title}</span>
                    <span className={listStyles.itemMeta}>{meta}</span>
                  </span>
                  <span className={a11y.visuallyHidden}>{t("common.editHint")}</span>
                </button>
                <IconButton
                  variant="surface"
                  className={listStyles.itemAction}
                  label={t("attachments.remove", { title })}
                  onClick={() =>
                    onChange((current) => current.filter((_, other) => other !== index))
                  }
                >
                  <IconTrash size={20} stroke={2} aria-hidden />
                </IconButton>
              </li>
            );
          })}
          {uploads.map(({ id, name }) => (
            <li key={id} className={listStyles.item} data-static>
              <span className={listStyles.itemButton}>
                <SpinnerCircle size={20} />
                <span className={listStyles.itemText}>
                  <span>{name}</span>
                  <span className={listStyles.itemMeta}>{t("attachments.uploading")}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {remaining > 0 && (
        <Menu
          trigger={
            <button
              type="button"
              className={listStyles.addButton}
              aria-label={t("attachments.addTitle")}
            >
              <IconPlus size={20} stroke={2.4} aria-hidden />
              {t("attachments.add")}
            </button>
          }
        >
          <MenuItem
            icon={<IconWorld size={18} stroke={2} aria-hidden />}
            onClick={() => openDrawer("link")}
          >
            {t("attachments.link.kind")}
          </MenuItem>
          <MenuItem
            icon={<IconMail size={18} stroke={2} aria-hidden />}
            onClick={() => openDrawer("email")}
          >
            {t("attachments.email.kind")}
          </MenuItem>
          <MenuItem
            icon={<IconFile size={18} stroke={2} aria-hidden />}
            onClick={() => openDrawer("file")}
          >
            {t("attachments.file.kind")}
          </MenuItem>
        </Menu>
      )}
      {error && (
        <p role="alert" className={listStyles.error}>
          {t(`attachments.errors.${error}`, { count: activityLimits.attachments })}
        </p>
      )}
      <Drawer
        title={t(`attachments.${drawer.kind}.${editedAttachment ? "editTitle" : "addTitle"}`)}
        closeLabel={t("common.close")}
        open={drawer.open}
        onOpenChange={(open) => setDrawer((current) => ({ ...current, open }))}
        initialFocus={inputRef}
      >
        {form()}
      </Drawer>
    </Fieldset>
  );
}
