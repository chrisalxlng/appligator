import type { ActivityInput } from "@appligator/shared";
import { and, eq, type SQL } from "drizzle-orm";
import type { Database } from "../db/database.ts";
import { activities, mailAssignments, mailMessages } from "../db/schema.ts";
import { updateApplicationStatus } from "../routes/applicationStatus.ts";
import { insertActivity } from "../routes/activityRows.ts";

type MailMessageRow = typeof mailMessages.$inferSelect;

export function counterpartOf({ folder, content }: Pick<MailMessageRow, "folder" | "content">) {
  const addresses = folder === "sent" ? content.to : content.from;
  return addresses.split(",")[0]!.trim();
}

interface Assignment {
  messageWhere: SQL | undefined;
  applicationId: string;
  activity: ActivityInput;
  automatic: boolean;
}

export async function assignMessage(
  tx: Database,
  { messageWhere, applicationId, activity, automatic }: Assignment,
) {
  const [message] = await tx
    .update(mailMessages)
    .set({
      status: automatic ? "autoAssigned" : "assigned",
      applicationId,
      suggestion: null,
    })
    .where(messageWhere)
    .returning();
  if (!message) return undefined;

  const inserted = await insertActivity(tx, applicationId, activity, { automatic });
  await tx
    .update(mailMessages)
    .set({ activityId: inserted.id })
    .where(eq(mailMessages.id, message.id));

  const link = { applicationId, sender: counterpartOf(message) };
  await tx
    .insert(mailAssignments)
    .values({ ...link, userId: message.userId, messageIdHash: message.messageIdHash })
    .onConflictDoUpdate({
      target: [mailAssignments.userId, mailAssignments.messageIdHash],
      set: link,
    });
  return inserted;
}

export async function unassignMessage(tx: Database, message: MailMessageRow) {
  if (message.activityId) {
    await tx.delete(activities).where(eq(activities.id, message.activityId));
    if (message.applicationId) await updateApplicationStatus(tx, message.applicationId);
  }
  await tx
    .delete(mailAssignments)
    .where(
      and(
        eq(mailAssignments.userId, message.userId),
        eq(mailAssignments.messageIdHash, message.messageIdHash),
      ),
    );
  await tx
    .update(mailMessages)
    .set({ status: "pending", applicationId: null, activityId: null })
    .where(eq(mailMessages.id, message.id));
}
