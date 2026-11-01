import type { Attachment } from "@appligator/shared";
import { useEffect, useRef } from "react";
import { fileIdsOf } from "./attachments.ts";
import { useStash } from "./useStash.ts";

export function useDeleteFiles() {
  const stash = useStash();
  return (fileIds: string[]) =>
    void Promise.allSettled(fileIds.map((fileId) => stash.remove(fileId)));
}

/**
 * Files are uploaded as soon as they are added to a form, so the form deletes the files that do not
 * end up in the saved attachments: removed ones after saving, and new ones when it is left unsaved.
 * Saving may unmount the form before it completes, so the deletion waits for the save instead.
 */
export function useFileCleanup(attachments: Attachment[]) {
  const deleteFiles = useDeleteFiles();
  const deleteFilesRef = useRef(deleteFiles);
  const initialFileIds = useRef(fileIdsOf(attachments));
  const addedFileIds = useRef(new Set<string>());
  const isSaving = useRef(false);
  const isUnmounted = useRef(false);

  useEffect(() => {
    deleteFilesRef.current = deleteFiles;
  });

  useEffect(() => {
    for (const fileId of fileIdsOf(attachments)) {
      if (!initialFileIds.current.includes(fileId)) addedFileIds.current.add(fileId);
    }
  }, [attachments]);

  useEffect(() => {
    const added = addedFileIds.current;
    isUnmounted.current = false;
    return () => {
      isUnmounted.current = true;
      if (!isSaving.current) deleteFilesRef.current([...added]);
    };
  }, []);

  return {
    async save<Result>(savedAttachments: Attachment[], saving: Promise<Result>) {
      isSaving.current = true;
      try {
        const result = await saving;
        const savedFileIds = new Set(fileIdsOf(savedAttachments));
        deleteFilesRef.current(
          [...initialFileIds.current, ...addedFileIds.current].filter(
            (fileId) => !savedFileIds.has(fileId),
          ),
        );
        return result;
      } catch (error) {
        isSaving.current = false;
        if (isUnmounted.current) deleteFilesRef.current([...addedFileIds.current]);
        throw error;
      }
    },
  };
}
