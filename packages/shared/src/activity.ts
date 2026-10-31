import { z } from "zod";
import { jobDetailsSchema, jobLimits, requiredText } from "./job.ts";

export const activityTypes = [
  "applicationSubmitted",
  "receiptConfirmed",
  "interviewScheduled",
  "interviewHeld",
  "taskReceived",
  "taskSubmitted",
  "documentsRequested",
  "documentsSubmitted",
  "statusInquired",
  "offerReceived",
  "counterOfferSubmitted",
  "offerAccepted",
  "offerDeclined",
  "rejectionReceived",
  "applicationWithdrawn",
  "applicationPaused",
  "other",
] as const;

const activityFields = ["terms", "appointmentAt", "dueDate", "responseDeadline"] as const;

export const activityTypeFields: Record<ActivityType, readonly ActivityField[]> = {
  applicationSubmitted: ["terms"],
  receiptConfirmed: [],
  interviewScheduled: ["appointmentAt"],
  interviewHeld: ["terms"],
  taskReceived: ["dueDate"],
  taskSubmitted: [],
  documentsRequested: [],
  documentsSubmitted: [],
  statusInquired: [],
  offerReceived: ["terms", "responseDeadline"],
  counterOfferSubmitted: ["terms"],
  offerAccepted: [],
  offerDeclined: [],
  rejectionReceived: [],
  applicationWithdrawn: [],
  applicationPaused: [],
  other: [],
};

export const activityLimits = {
  attachments: 20,
  linkLength: 2_000,
};

const activityTermsSchema = jobDetailsSchema.omit({ notes: true }).extend({
  position: requiredText.nullable(),
});

const linkAttachmentSchema = z.object({
  kind: z.literal("link"),
  url: z.url({ protocol: /^https?$/ }).max(activityLimits.linkLength),
  title: z.string().trim().max(jobLimits.textLength),
});

const attachmentSchema = z.discriminatedUnion("kind", [linkAttachmentSchema]);

export const activityInputSchema = z
  .object({
    type: z.enum(activityTypes),
    occurredAt: z.iso.datetime(),
    terms: activityTermsSchema.nullable(),
    appointmentAt: z.iso.datetime().nullable(),
    dueDate: z.iso.date().nullable(),
    responseDeadline: z.iso.date().nullable(),
    notes: z.string().max(jobLimits.notesLength),
    attachments: z.array(attachmentSchema).max(activityLimits.attachments),
  })
  .refine(
    (activity) =>
      activityFields.every(
        (field) => activityTypeFields[activity.type].includes(field) || activity[field] === null,
      ),
    { message: "The activity type does not have this field" },
  );

export const activitySchema = activityInputSchema.safeExtend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const activityListSchema = z.array(activitySchema);

export type ActivityType = (typeof activityTypes)[number];
type ActivityField = (typeof activityFields)[number];
export type ActivityTerms = z.infer<typeof activityTermsSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type ActivityInput = z.infer<typeof activityInputSchema>;
export type Activity = z.infer<typeof activitySchema>;
