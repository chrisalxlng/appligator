import type { Attachment } from "@appligator/shared";

export type FileAttachment = Extract<Attachment, { kind: "file" }>;
export type EmailAttachment = Extract<Attachment, { kind: "email" }>;
export type LinkAttachment = Extract<Attachment, { kind: "link" }>;

export function fileIdsOf(attachments: Attachment[]) {
  return attachments.flatMap((attachment) =>
    attachment.kind === "file" ? [attachment.fileId] : [],
  );
}
