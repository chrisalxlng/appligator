import { createHash } from "node:crypto";
import type { MailFolder } from "@appligator/shared";
import type { Database } from "../db/database.ts";
import { mailMessages } from "../db/schema.ts";
import { parseMail } from "./parseMail.ts";

export interface RawMail {
  folder: MailFolder;
  source: Uint8Array;
}

function hash(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export async function ingestMail(db: Database, userId: string, { folder, source }: RawMail) {
  const { messageId, referencedMessageIds, content } = await parseMail(source);
  const messageIdHash = hash(messageId ?? source);
  const referencedHashes = referencedMessageIds.map(hash);

  const inserted = await db
    .insert(mailMessages)
    .values({ userId, messageIdHash, folder, content, referencedHashes })
    .onConflictDoNothing()
    .returning({ id: mailMessages.id });
  return inserted.length > 0;
}
