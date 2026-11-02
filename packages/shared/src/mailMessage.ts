import { z } from "zod";
import { activityInputSchema } from "./activity.ts";
import { statusCountsSchema } from "./status.ts";

export const mailFolders = ["inbox", "sent"] as const;
export const mailMessageStatuses = ["pending", "assigned", "dismissed"] as const;

export const mailMessageListItemSchema = z.object({
  id: z.uuid(),
  folder: z.enum(mailFolders),
  status: z.enum(mailMessageStatuses),
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  sentAt: z.iso.datetime().nullable(),
  attachmentCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});

export const mailMessageSchema = mailMessageListItemSchema.extend({
  body: z.string(),
  application: z.object({ id: z.uuid(), position: z.string() }).nullable(),
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
