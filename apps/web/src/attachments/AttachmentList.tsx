import { activityLimits, type Attachment } from "@appligator/shared";
import { Drawer, Fieldset, IconButton, Menu, MenuItem, SpinnerCircle } from "@appligator/ui";
import { IconFile, IconMail, IconPlus, IconTrash, IconWorld } from "@tabler/icons-react";
import { useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import listStyles from "../details/list.module.css";
import styles from "./AttachmentList.module.css";
import { EmailForm } from "./EmailForm.tsx";
import { importEmail, isEmailFile } from "./emailImport.ts";
import { LinkForm } from "./LinkForm.tsx";
import { maxFileSize, StashError } from "./stashClient.ts";
import { useDescribeAttachment } from "./useDescribeAttachment.ts";
import { useOpenFile } from "./useOpenFile.ts";
import { useStash } from "./useStash.ts";

type EditableKind = "link" | "email";
type AttachmentError = "tooMany" | "tooLarge" | "limitReached" | "uploadFailed" | "importFailed";

interface AttachmentListProps {
  attachments: Attachment[];
  onChange: (update: (attachments: Attachment[]) => Attachment[]) => void;
}

function uploadError(error: unknown): AttachmentError {
  if (error instanceof StashError && error.status === 413) return "tooLarge";
  if (error instanceof StashError && error.status === 422) return "limitReached";
  return "uploadFailed";
}

export function AttachmentList({ attachments, onChange }: AttachmentListProps) {
  const { t } = useTranslation();
  const stash = useStash();
  const openFile = useOpenFile();
  const describe = useDescribeAttachment();
  const [drawer, setDrawer] = useState<{
    open: boolean;
    kind: EditableKind;
    index: number | null;
  }>({ open: false, kind: "link", index: null });
  const [uploads, setUploads] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<AttachmentError>();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editedAttachment = drawer.index === null ? undefined : attachments[drawer.index];
  const remaining = activityLimits.attachments - attachments.length - uploads.length;

  function add(attachment: Attachment) {
    onChange((current) => [...current, attachment]);
  }

  async function addEmail(file: File) {
    try {
      add(await importEmail(file));
    } catch {
      setError("importFailed");
    }
  }

  async function upload(file: File) {
    if (file.size > maxFileSize) {
      setError("tooLarge");
      return;
    }
    const fileId = crypto.randomUUID();
    setUploads((current) => [...current, { id: fileId, name: file.name }]);
    try {
      await stash.upload(fileId, file);
      add({ kind: "file", fileId, name: file.name, mimeType: file.type });
    } catch (uploadFailure) {
      setError(uploadError(uploadFailure));
    } finally {
      setUploads((current) => current.filter(({ id }) => id !== fileId));
    }
  }

  function addFiles(files: File[]) {
    setError(files.length > remaining ? "tooMany" : undefined);
    for (const file of files.slice(0, Math.max(remaining, 0))) {
      void (isEmailFile(file) ? addEmail(file) : upload(file));
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    addFiles([...event.dataTransfer.files]);
  }

  function edit(index: number) {
    const attachment = attachments[index]!;
    if (attachment.kind === "file") openFile.open(attachment);
    else setDrawer({ open: true, kind: attachment.kind, index });
  }

  function save(attachment: Attachment) {
    onChange((current) =>
      drawer.index === null
        ? [...current, attachment]
        : current.map((other, index) => (index === drawer.index ? attachment : other)),
    );
    setDrawer((current) => ({ ...current, open: false }));
  }

  const drawerTitle =
    `attachments.${drawer.kind}.${editedAttachment ? "editTitle" : "addTitle"}` as const;

  return (
    <Fieldset legend={t("attachments.legend")}>
      <div
        className={styles.dropZone}
        data-dragging={isDragging || undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={drop}
      >
        {(attachments.length > 0 || uploads.length > 0) && (
          <ul className={listStyles.list}>
            {attachments.map((attachment, index) => {
              const { icon: AttachmentIcon, title, meta } = describe(attachment);
              return (
                <li key={`${index}-${title}`} className={listStyles.item}>
                  <button
                    type="button"
                    className={listStyles.itemButton}
                    onClick={() => edit(index)}
                  >
                    <AttachmentIcon size={20} stroke={2} aria-hidden />
                    <span className={listStyles.itemText}>
                      <span>{title}</span>
                      <span className={listStyles.itemMeta}>{meta}</span>
                    </span>
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
              <li key={id} className={`${listStyles.item} ${styles.upload}`}>
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
                className={`${listStyles.addButton} ${styles.addButton}`}
                aria-label={t("attachments.addTitle")}
              >
                <IconPlus size={20} stroke={2.4} aria-hidden />
                {t("attachments.add")}
                <span className={styles.dropHint}>{t("attachments.dropHint")}</span>
              </button>
            }
          >
            <MenuItem
              icon={<IconWorld size={18} stroke={2} aria-hidden />}
              onClick={() => setDrawer({ open: true, kind: "link", index: null })}
            >
              {t("attachments.link.kind")}
            </MenuItem>
            <MenuItem
              icon={<IconMail size={18} stroke={2} aria-hidden />}
              onClick={() => setDrawer({ open: true, kind: "email", index: null })}
            >
              {t("attachments.email.kind")}
            </MenuItem>
            <MenuItem
              icon={<IconFile size={18} stroke={2} aria-hidden />}
              onClick={() => fileInputRef.current?.click()}
            >
              {t("attachments.file.kind")}
            </MenuItem>
          </Menu>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          aria-label={t("attachments.file.kind")}
          onChange={(event) => {
            addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className={listStyles.error}>
          {t(`attachments.errors.${error}`, { count: activityLimits.attachments })}
        </p>
      )}
      {openFile.isError && (
        <p role="alert" className={listStyles.error}>
          {t("attachments.errors.openFailed")}
        </p>
      )}
      <Drawer
        title={t(drawerTitle)}
        closeLabel={t("common.close")}
        open={drawer.open}
        onOpenChange={(open) => setDrawer((current) => ({ ...current, open }))}
        initialFocus={inputRef}
      >
        {drawer.kind === "link" ? (
          <LinkForm
            inputRef={inputRef}
            attachment={editedAttachment?.kind === "link" ? editedAttachment : undefined}
            onSave={save}
          />
        ) : (
          <EmailForm
            inputRef={inputRef}
            attachment={editedAttachment?.kind === "email" ? editedAttachment : undefined}
            onSave={save}
          />
        )}
      </Drawer>
    </Fieldset>
  );
}
