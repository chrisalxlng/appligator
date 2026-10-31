import type { Attachment } from "@appligator/shared";
import { useState } from "react";
import { importEmail, isEmailFile } from "./emailImport.ts";
import { maxFileSize, StashError } from "./stashClient.ts";
import { useStash } from "./useStash.ts";

export type AttachmentError =
  | "tooMany"
  | "tooLarge"
  | "limitReached"
  | "uploadFailed"
  | "importFailed"
  | "notAnEmail"
  | "fileRequired";

export function uploadError(error: unknown): AttachmentError {
  if (error instanceof StashError && error.status === 413) return "tooLarge";
  if (error instanceof StashError && error.status === 422) return "limitReached";
  return "uploadFailed";
}

export function useUploadFile() {
  const stash = useStash();

  return async (file: File) => {
    if (file.size > maxFileSize) throw new StashError(413);
    const fileId = crypto.randomUUID();
    await stash.upload(fileId, file);
    return { fileId, name: file.name, mimeType: file.type };
  };
}

export function titleOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/** Adds dropped or chosen files: emails are imported along with their links, others uploaded. */
export function useAddFiles(remaining: number, add: (attachments: Attachment[]) => void) {
  const uploadFile = useUploadFile();
  const [uploads, setUploads] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<AttachmentError>();

  async function addEmail(file: File) {
    try {
      const { email, links } = await importEmail(file);
      add([email, ...links]);
    } catch {
      setError("importFailed");
    }
  }

  async function upload(file: File) {
    const id = crypto.randomUUID();
    setUploads((current) => [...current, { id, name: file.name }]);
    try {
      add([{ kind: "file", title: titleOf(file.name), ...(await uploadFile(file)) }]);
    } catch (failure) {
      setError(uploadError(failure));
    } finally {
      setUploads((current) => current.filter((other) => other.id !== id));
    }
  }

  function addFiles(files: File[]) {
    const accepted = files.slice(0, Math.max(remaining - uploads.length, 0));
    setError(accepted.length < files.length ? "tooMany" : undefined);
    for (const file of accepted) void (isEmailFile(file) ? addEmail(file) : upload(file));
  }

  return { addFiles, uploads, error };
}
