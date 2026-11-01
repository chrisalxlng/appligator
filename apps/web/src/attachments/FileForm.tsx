import { jobLimits } from "@appligator/shared";
import { Button, Field, Fieldset, submitKeyShortcuts, TextInput } from "@appligator/ui";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import listStyles from "../details/list.module.css";
import { useShortcutHints } from "../shortcuts/useShortcutHints.ts";
import type { FileAttachment } from "./attachments.ts";
import { DropZone } from "./DropZone.tsx";
import { titleOf, uploadError, useUploadFile, type AttachmentError } from "./useAddFiles.ts";
import { useDescribeAttachment } from "./useDescribeAttachment.ts";
import { useDeleteFiles } from "./useFileCleanup.ts";

type UploadedFile = Pick<FileAttachment, "fileId" | "name" | "mimeType">;

interface FileFormProps {
  titleRef: RefObject<HTMLInputElement | null>;
  attachment?: FileAttachment;
  onSave: (attachment: FileAttachment) => void;
}

export function FileForm({ titleRef, attachment, onSave }: FileFormProps) {
  const { t } = useTranslation();
  const uploadFile = useUploadFile();
  const deleteFiles = useDeleteFiles();
  const describe = useDescribeAttachment();
  const [file, setFile] = useState<UploadedFile | null>(attachment ?? null);
  const [title, setTitle] = useState(attachment?.title ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<AttachmentError | "titleTooLong">();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedFileIds = useRef<string[]>([]);
  const savedFileId = useRef<string | null>(null);
  const deleteFilesRef = useRef(deleteFiles);
  const shortcutHints = useShortcutHints();

  useEffect(() => {
    deleteFilesRef.current = deleteFiles;
  });

  useEffect(() => {
    const uploaded = uploadedFileIds.current;
    return () =>
      deleteFilesRef.current(uploaded.filter((fileId) => fileId !== savedFileId.current));
  }, []);

  async function choose(chosen: File | undefined) {
    if (!chosen) return;
    setError(undefined);
    setIsUploading(true);
    try {
      const uploaded = await uploadFile(chosen);
      uploadedFileIds.current.push(uploaded.fileId);
      setFile(uploaded);
      setTitle((current) => (current.trim() ? current : titleOf(chosen.name)));
    } catch (failure) {
      setError(uploadError(failure));
    } finally {
      setIsUploading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    // The drawer is portaled, but React still bubbles the submit to the surrounding activity form.
    event.stopPropagation();
    if (isUploading) return;
    const trimmedTitle = title.trim();
    if (!file) return setError("fileRequired");
    if (trimmedTitle.length > jobLimits.textLength) return setError("titleTooLong");
    savedFileId.current = file.fileId;
    onSave({ kind: "file", ...file, title: trimmedTitle });
  }

  const chosenFile = file && describe({ kind: "file", ...file, title: "" });

  return (
    <DropZone label={t("attachments.file.dropHere")} onFiles={(files) => void choose(files[0])}>
      <form className={listStyles.form} onSubmit={submit} noValidate>
        <Fieldset legend={t("attachments.file.kind")}>
          {chosenFile && (
            <div className={listStyles.item} data-static>
              <span className={listStyles.itemButton}>
                <chosenFile.icon size={20} stroke={2} aria-hidden />
                <span className={listStyles.itemText}>
                  <span>{file.name}</span>
                  <span className={listStyles.itemMeta}>{chosenFile.meta}</span>
                </span>
              </span>
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            pending={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {t(file ? "attachments.file.replace" : "attachments.file.choose")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            aria-label={t("attachments.file.choose")}
            onChange={(event) => {
              void choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </Fieldset>
        <Field label={t("attachments.file.title")}>
          <TextInput ref={titleRef} value={title} onValueChange={setTitle} />
        </Field>
        {error && (
          <p role="alert" className={listStyles.error}>
            {t(`attachments.errors.${error}`)}
          </p>
        )}
        <Button
          type="submit"
          pending={isUploading}
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
