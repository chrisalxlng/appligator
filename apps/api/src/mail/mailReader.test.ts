import type { ImapFlow } from "imapflow";
import { expect, test, vi } from "vite-plus/test";
import type { RawMail } from "./ingestMail.ts";
import { createMailReader } from "./mailReader.ts";

const access = { host: "imap.example.com", username: "user", password: "secret" };

interface FakeFolder {
  uidValidity: bigint;
  uids: number[];
}

function fakeMailbox(folders: Record<string, FakeFolder>, sentPath?: string) {
  const fetched: string[] = [];
  const locks: { path: string; readOnly?: boolean }[] = [];
  const close = vi.fn();
  const release = vi.fn();
  let selected = "";

  const client = {
    close,
    list: async () => (sentPath ? [{ path: sentPath, specialUse: "\\Sent" }] : []),
    getMailboxLock: async (path: string, options: { readOnly?: boolean }) => {
      selected = path;
      locks.push({ path, readOnly: options.readOnly });
      return { release };
    },
    get mailbox() {
      const { uidValidity, uids } = folders[selected]!;
      return { uidValidity, uidNext: Math.max(0, ...uids) + 1 };
    },
    // Like a real server: a range up to * also matches the newest email.
    search: async ({ uid }: { uid: string }) => {
      const start = Number(uid.split(":")[0]);
      const { uids } = folders[selected]!;
      return [...new Set([...uids.filter((other) => other >= start), Math.max(...uids)])];
    },
    async *fetch(range: string) {
      for (const uid of range.split(",")) {
        fetched.push(`${selected}:${uid}`);
        yield { uid: Number(uid), source: Buffer.from(`${selected}:${uid}`) };
      }
    },
  };

  return {
    read: createMailReader(async () => client as unknown as ImapFlow),
    fetched,
    locks,
    close,
    release,
  };
}

function collect() {
  const mails: RawMail[] = [];
  return { mails, onMail: async (mail: RawMail) => void mails.push(mail) };
}

test("starts with new emails only and imports nothing on the first read", async () => {
  const { read, fetched } = fakeMailbox({ INBOX: { uidValidity: 7n, uids: [1, 2, 3] } });
  const { mails, onMail } = collect();

  const result = await read(access, {}, onMail);

  expect(mails).toEqual([]);
  expect(fetched).toEqual([]);
  expect(result).toEqual({
    cursors: { inbox: { uidValidity: "7", lastUid: 3 } },
    hasMore: false,
  });
});

test("reads the emails after the cursor and advances it", async () => {
  const { read, fetched } = fakeMailbox({ INBOX: { uidValidity: 7n, uids: [1, 2, 5, 9] } });
  const { mails, onMail } = collect();

  const result = await read(access, { inbox: { uidValidity: "7", lastUid: 2 } }, onMail);

  expect(fetched).toEqual(["INBOX:5", "INBOX:9"]);
  expect(mails.map(({ folder }) => folder)).toEqual(["inbox", "inbox"]);
  expect(result.cursors.inbox).toEqual({ uidValidity: "7", lastUid: 9 });
});

test("does not read the newest email again without new ones", async () => {
  const { read, fetched } = fakeMailbox({ INBOX: { uidValidity: 7n, uids: [1, 2, 3] } });
  const cursor = { uidValidity: "7", lastUid: 3 };

  const result = await read(access, { inbox: cursor }, collect().onMail);

  expect(fetched).toEqual([]);
  expect(result.cursors.inbox).toEqual(cursor);
});

test("starts over from the newest email when the folder was renumbered", async () => {
  const { read, fetched } = fakeMailbox({ INBOX: { uidValidity: 8n, uids: [1, 2] } });

  const result = await read(access, { inbox: { uidValidity: "7", lastUid: 90 } }, collect().onMail);

  expect(fetched).toEqual([]);
  expect(result.cursors.inbox).toEqual({ uidValidity: "8", lastUid: 2 });
});

test("reads large backlogs in batches", async () => {
  const uids = Array.from({ length: 60 }, (_, index) => index + 1);
  const { read, fetched } = fakeMailbox({ INBOX: { uidValidity: 7n, uids } });

  const result = await read(access, { inbox: { uidValidity: "7", lastUid: 0 } }, collect().onMail);

  expect(fetched).toHaveLength(50);
  expect(result.cursors.inbox!.lastUid).toBe(50);
  expect(result.hasMore).toBe(true);
});

test("also reads the sent folder, opening every folder read-only", async () => {
  const { read, locks, release } = fakeMailbox(
    {
      INBOX: { uidValidity: 7n, uids: [1] },
      Gesendet: { uidValidity: 3n, uids: [4, 5] },
    },
    "Gesendet",
  );
  const { mails, onMail } = collect();

  const result = await read(
    access,
    { inbox: { uidValidity: "7", lastUid: 1 }, sent: { uidValidity: "3", lastUid: 4 } },
    onMail,
  );

  expect(mails.map(({ folder }) => folder)).toEqual(["sent"]);
  expect(result.cursors.sent).toEqual({ uidValidity: "3", lastUid: 5 });
  expect(locks).toEqual([
    { path: "INBOX", readOnly: true },
    { path: "Gesendet", readOnly: true },
  ]);
  expect(release).toHaveBeenCalledTimes(2);
});

test("closes the connection and keeps the failure when reading fails", async () => {
  const { read, close, release } = fakeMailbox({ INBOX: { uidValidity: 7n, uids: [1, 2] } });

  await expect(
    read(access, { inbox: { uidValidity: "7", lastUid: 1 } }, () =>
      Promise.reject(new Error("failed")),
    ),
  ).rejects.toThrow("failed");

  expect(release).toHaveBeenCalled();
  expect(close).toHaveBeenCalled();
});
