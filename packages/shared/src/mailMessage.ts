import { z } from "zod";
import {
  activityInputSchema,
  activityTypes,
  type ActivityInput,
  type ActivityType,
  type Attachment,
} from "./activity.ts";
import { statusCountsSchema } from "./status.ts";

export const mailFolders = ["inbox", "sent"] as const;
export const mailMessageStatuses = ["pending", "autoAssigned", "assigned", "dismissed"] as const;

export const mailMessageListItemSchema = z.object({
  id: z.uuid(),
  folder: z.enum(mailFolders),
  status: z.enum(mailMessageStatuses),
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  sentAt: z.iso.datetime().nullable(),
  attachmentCount: z.number().int().min(0),
  hasSuggestion: z.boolean(),
  createdAt: z.iso.datetime(),
});

const linkedApplicationSchema = z.object({ id: z.uuid(), position: z.string() });

export const mailMessageSchema = mailMessageListItemSchema.extend({
  body: z.string(),
  application: linkedApplicationSchema.nullable(),
  suggestion: z
    .object({
      application: linkedApplicationSchema,
      activityType: z.enum(activityTypes),
      appointmentAt: z.iso.datetime().nullable(),
      dueDate: z.iso.date().nullable(),
      responseDeadline: z.iso.date().nullable(),
    })
    .nullable(),
});

export const mailMessageListPageSchema = z.object({
  items: z.array(mailMessageListItemSchema),
  nextCursor: z.string().nullable(),
});

export const mailMessageStatusCountsSchema = statusCountsSchema(mailMessageStatuses);

export const mailSyncResultSchema = z.object({ newMails: z.number().int().min(0) });

export const mailAssignmentInputSchema = z.object({
  applicationId: z.uuid(),
  activity: activityInputSchema,
});

export type MailFolder = (typeof mailFolders)[number];
export type MailMessageStatus = (typeof mailMessageStatuses)[number];
export type MailMessageListItem = z.infer<typeof mailMessageListItemSchema>;
export type MailMessage = z.infer<typeof mailMessageSchema>;
export type MailAssignmentInput = z.infer<typeof mailAssignmentInputSchema>;

type MailAttachmentFields = Omit<Extract<Attachment, { kind: "email" }>, "kind">;

export function attachmentFromMail({ subject, from, to, sentAt, body }: MailAttachmentFields) {
  return { kind: "email" as const, subject, from, to, sentAt, body };
}

export function activityInputFromMail(
  type: ActivityType,
  mail: MailAttachmentFields,
  receivedAt: string,
  dates: Partial<Pick<ActivityInput, "appointmentAt" | "dueDate" | "responseDeadline">> = {},
): ActivityInput {
  return {
    type,
    occurredAt: mail.sentAt ?? receivedAt,
    terms: null,
    appointmentAt: null,
    dueDate: null,
    responseDeadline: null,
    notes: "",
    attachments: [attachmentFromMail(mail)],
    ...dates,
  };
}
