import { useMutation } from "@tanstack/react-query";
import type { FileAttachment } from "./attachments.ts";
import { useStash } from "./useStash.ts";

const previewableTypes = [/^image\//, /^text\/plain$/, /^application\/pdf$/];

function isPreviewable(mimeType: string) {
  return previewableTypes.some((type) => type.test(mimeType));
}

function download(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}

export function useOpenFile() {
  const stash = useStash();

  const open = useMutation({
    mutationFn: async ({ file, tab }: { file: FileAttachment; tab: Window | null }) => {
      try {
        const blob = await stash.download(file.fileId);
        const url = URL.createObjectURL(new Blob([blob], { type: file.mimeType }));
        if (tab) tab.location.href = url;
        else download(url, file.name);
      } catch (error) {
        tab?.close();
        throw error;
      }
    },
  });

  return {
    // Browsers only allow opening a tab right in the click, before the file is loaded.
    open: (file: FileAttachment) =>
      open.mutate({ file, tab: isPreviewable(file.mimeType) ? window.open("", "_blank") : null }),
    isError: open.isError,
  };
}
