import type { Attachment } from "@appligator/shared";
import { useEffect, useRef, useState } from "react";
import { exceedsEmailLimits, importEmail, isEmailFile } from "./emailImport.ts";
import { maxFileSize, StashError } from "./stashClient.ts";
import { useStash } from "./useStash.ts";

export type AttachmentError =
  | "tooMany"
  | "tooLarge"
  | "limitReached"
  | "uploadFailed"
  | "importFailed"
  | "emailTooLong"
  | "notAnEmail"
  | "fileRequired";

export function uploadError(error: unknown): AttachmentError {
  if (error instanceof StashError && error.status === 413) return "tooLarge";
  if (error instanceof StashError && error.status === 422) return "limitReached";
  return "uploadFailed";
}

export function useUploadFile() {
  const stash = useStash();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return async (file: File) => {
    if (file.size > maxFileSize) throw new StashError(413);
    const fileId = crypto.randomUUID();
    await stash.upload(fileId, file);
    if (!isMounted.current) {
      await stash.remove(fileId);
      throw new Error("The form was left during the upload");
    }
    return { fileId, name: file.name, mimeType: file.type };
  };
}

export function titleOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

export function useAddFiles(remaining: number, add: (attachments: Attachment[]) => void) {
  const uploadFile = useUploadFile();
  const [uploads, setUploads] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<AttachmentError>();

  async function addEmail(file: File) {
    try {
      const { email, links } = await importEmail(file);
      if (exceedsEmailLimits(email)) {
        setError("emailTooLong");
        return;
      }
      if (links.length + 1 > remaining) setError("tooMany");
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
