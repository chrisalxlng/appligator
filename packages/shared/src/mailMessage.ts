import { z } from "zod";
import { activityInputSchema } from "./activity.ts";

export const mailFolders = ["inbox", "sent"] as const;
export const mailMessageStatuses = ["pending", "assigned", "dismissed"] as const;

export const mailMessageListItemSchema = z.object({
  id: z.uuid(),
  folder: z.enum(mailFolders),
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  sentAt: z.iso.datetime().nullable(),
  attachmentCount: z.number().int().min(0),
  receivedAt: z.iso.datetime(),
});

export const mailMessageSchema = mailMessageListItemSchema.extend({ body: z.string() });

export const mailMessageListSchema = z.object({
  items: z.array(mailMessageListItemSchema),
  total: z.number().int().min(0),
});

export const mailMessageCountSchema = z.object({ count: z.number().int().min(0) });

export const mailAssignmentInputSchema = z.object({
  applicationId: z.uuid(),
  activity: activityInputSchema,
});

export type MailFolder = (typeof mailFolders)[number];
export type MailMessageListItem = z.infer<typeof mailMessageListItemSchema>;
export type MailMessage = z.infer<typeof mailMessageSchema>;
export type MailAssignmentInput = z.infer<typeof mailAssignmentInputSchema>;
