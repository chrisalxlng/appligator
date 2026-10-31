import type { Attachment } from "@appligator/shared";

export type FileAttachment = Extract<Attachment, { kind: "file" }>;

export function fileIdsOf(attachments: Attachment[]) {
  return attachments.flatMap((attachment) =>
    attachment.kind === "file" ? [attachment.fileId] : [],
  );
}
