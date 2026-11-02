import { createHash } from "node:crypto";
import type { MailFolder } from "@appligator/shared";
import type { Database } from "../db/database.ts";
import { mailMessages } from "../db/schema.ts";
import { parseMail } from "./parseMail.ts";

export interface RawMail {
  folder: MailFolder;
  source: Uint8Array;
}

export async function ingestMail(db: Database, userId: string, { folder, source }: RawMail) {
  const { messageId, content } = await parseMail(source);
  const messageIdHash = createHash("sha256")
    .update(messageId ?? source)
    .digest("hex");

  const inserted = await db
    .insert(mailMessages)
    .values({ userId, messageIdHash, folder, content })
    .onConflictDoNothing()
    .returning({ id: mailMessages.id });
  return inserted.length > 0;
}
