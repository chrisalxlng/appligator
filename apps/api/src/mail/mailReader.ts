import type { MailAccountInput, MailFolder } from "@appligator/shared";
import type { ImapFlow } from "imapflow";
import type { MailCursors, MailFolderCursor } from "../db/schema.ts";
import type { RawMail } from "./ingestMail.ts";
import type { OpenMailbox } from "./mailAccess.ts";

// Attachments can make an email arbitrarily large. Its text comes first, so shortening is harmless.
const maxMailBytes = 10 * 1024 * 1024;
const maxMailsPerFolder = 50;

export type ReadNewMail = (
  access: MailAccountInput,
  cursors: MailCursors,
  onMail: (mail: RawMail) => Promise<void>,
) => Promise<{ cursors: MailCursors; hasMore: boolean }>;

async function readFolder(
  client: ImapFlow,
  { path, folder }: { path: string; folder: MailFolder },
  cursor: MailFolderCursor | undefined,
  onMail: (mail: RawMail) => Promise<void>,
) {
  const lock = await client.getMailboxLock(path, { readOnly: true });
  try {
    const { uidValidity, uidNext } = client.mailbox as Exclude<ImapFlow["mailbox"], false>;
    const currentValidity = String(uidValidity);

    // Only new emails count: neither connecting nor a renumbered folder may import existing ones.
    if (cursor?.uidValidity !== currentValidity) {
      return {
        cursor: { uidValidity: currentValidity, lastUid: uidNext - 1 },
        hasMore: false,
      };
    }

    const found = await client.search({ uid: `${cursor.lastUid + 1}:*` }, { uid: true });
    // A range up to * always matches the newest email, even if it is older than the range's start.
    const newUids = (found || []).filter((uid) => uid > cursor.lastUid).sort((a, b) => a - b);
    const uids = newUids.slice(0, maxMailsPerFolder);
    if (uids.length === 0) return { cursor, hasMore: false };

    const query = { source: { maxLength: maxMailBytes } };
    for await (const { source } of client.fetch(uids.join(","), query, { uid: true })) {
      if (source) await onMail({ folder, source });
    }
    return {
      cursor: { uidValidity: currentValidity, lastUid: uids.at(-1)! },
      hasMore: newUids.length > uids.length,
    };
  } finally {
    lock.release();
  }
}

export function createMailReader(openMailbox: OpenMailbox): ReadNewMail {
  return async (access, cursors, onMail) => {
    const client = await openMailbox(access);
    try {
      const mailboxes = await client.list();
      const sent = mailboxes.find(({ specialUse }) => specialUse === "\\Sent");
      const folders = [
        { path: "INBOX", folder: "inbox" as const },
        ...(sent ? [{ path: sent.path, folder: "sent" as const }] : []),
      ];

      const nextCursors = { ...cursors };
      let hasMore = false;
      for (const folder of folders) {
        const result = await readFolder(client, folder, cursors[folder.folder], onMail);
        nextCursors[folder.folder] = result.cursor;
        hasMore ||= result.hasMore;
      }
      return { cursors: nextCursors, hasMore };
    } finally {
      client.close();
    }
  };
}
