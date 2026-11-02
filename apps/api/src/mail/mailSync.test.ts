import { eq } from "drizzle-orm";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { mailAccounts, mailMessages } from "../db/schema.ts";
import { testMailPasswordCipher } from "../testAuth.ts";
import { createTestDatabase } from "../testDatabase.ts";
import { createMailSync } from "./mailSync.ts";
import type { ReadNewMail } from "./mailReader.ts";

const db = await createTestDatabase();
const readNewMail = vi.fn<ReadNewMail>();
const log = { error: vi.fn(), warn: vi.fn() };
const sync = createMailSync({
  db,
  passwordCipher: testMailPasswordCipher,
  readNewMail,
  log: log as never,
});

const userId = "user-id";
const cursors = { inbox: { uidValidity: "7", lastUid: 3 } };
const minutes = (count: number) => count * 60 * 1000;

function rawMail(messageId: string) {
  return Buffer.from(`Message-ID: <${messageId}>\r\nSubject: ${messageId}\r\n\r\nHello`);
}

async function connectAccount(values: Partial<typeof mailAccounts.$inferInsert> = {}) {
  await db.insert(mailAccounts).values({
    userId,
    host: "imap.example.com",
    username: "user",
    encryptedPassword: testMailPasswordCipher.encrypt("secret", userId),
    nextSyncAt: new Date(Date.now() - 1000),
    ...values,
  });
}

async function storedAccount() {
  const [account] = await db.select().from(mailAccounts).where(eq(mailAccounts.userId, userId));
  return account!;
}

beforeEach(async () => {
  await db.delete(mailAccounts);
  await db.delete(mailMessages);
  readNewMail.mockReset().mockResolvedValue({ cursors, hasMore: false });
  log.error.mockClear();
});

test("reads a due account with the decrypted password and schedules the next sync", async () => {
  await connectAccount({ syncError: "connectionFailed", syncFailures: 2 });

  await sync.syncDueAccounts();

  expect(readNewMail).toHaveBeenCalledWith(
    { host: "imap.example.com", username: "user", password: "secret" },
    {},
    expect.any(Function),
  );
  const account = await storedAccount();
  expect(account.cursors).toEqual(cursors);
  expect(account.syncError).toBeNull();
  expect(account.syncFailures).toBe(0);
  expect(account.lastSyncedAt).not.toBeNull();
  expect(account.nextSyncAt!.getTime()).toBeGreaterThan(Date.now() + minutes(9));
});

test("leaves accounts alone that are not due or paused", async () => {
  await connectAccount({ nextSyncAt: new Date(Date.now() + minutes(5)) });
  await sync.syncDueAccounts();
  await db.update(mailAccounts).set({ nextSyncAt: null });
  await sync.syncDueAccounts();

  expect(readNewMail).not.toHaveBeenCalled();
});

test("stores new emails and each one only once", async () => {
  await connectAccount();
  readNewMail.mockImplementation(async (_access, _cursors, onMail) => {
    await onMail({ folder: "inbox", source: rawMail("a@example.com") });
    await onMail({ folder: "inbox", source: rawMail("b@example.com") });
    await onMail({ folder: "sent", source: rawMail("a@example.com") });
    return { cursors, hasMore: false };
  });

  await sync.syncDueAccounts();

  const messages = await db.select().from(mailMessages);
  expect(messages.map(({ content }) => content!.subject).sort()).toEqual([
    "a@example.com",
    "b@example.com",
  ]);
  expect(messages.every(({ status }) => status === "pending")).toBe(true);
});

test("keeps the same email of different users apart", async () => {
  await connectAccount();
  await db.insert(mailAccounts).values({
    userId: "other-user-id",
    host: "imap.example.com",
    username: "other",
    encryptedPassword: testMailPasswordCipher.encrypt("secret", "other-user-id"),
    nextSyncAt: new Date(Date.now() - 1000),
  });
  readNewMail.mockImplementation(async (_access, _cursors, onMail) => {
    await onMail({ folder: "inbox", source: rawMail("a@example.com") });
    return { cursors, hasMore: false };
  });

  await sync.syncDueAccounts();

  expect(await db.select().from(mailMessages)).toHaveLength(2);
});

test("skips an unreadable email and still advances", async () => {
  await connectAccount();
  readNewMail.mockImplementation(async (_access, _cursors, onMail) => {
    await onMail({ folder: "inbox", source: undefined as never });
    await onMail({ folder: "inbox", source: rawMail("b@example.com") });
    return { cursors, hasMore: false };
  });

  await sync.syncDueAccounts();

  expect(log.error).toHaveBeenCalled();
  expect(await db.select().from(mailMessages)).toHaveLength(1);
  expect((await storedAccount()).cursors).toEqual(cursors);
});

test("continues right away with a large backlog", async () => {
  await connectAccount();
  readNewMail
    .mockResolvedValueOnce({ cursors, hasMore: true })
    .mockResolvedValueOnce({ cursors, hasMore: false });

  await sync.syncDueAccounts();

  expect(readNewMail).toHaveBeenCalledTimes(2);
});

test("keeps the cursors and backs off after a failed connection", async () => {
  await connectAccount({ cursors });
  readNewMail.mockRejectedValue(new Error("offline"));

  await sync.syncDueAccounts();

  const account = await storedAccount();
  expect(account.cursors).toEqual(cursors);
  expect(account.syncError).toBe("connectionFailed");
  expect(account.syncFailures).toBe(1);
  expect(account.nextSyncAt!.getTime()).toBeGreaterThan(Date.now() + minutes(19));
});

test("limits the backoff", async () => {
  await connectAccount({ syncFailures: 20 });
  readNewMail.mockRejectedValue(new Error("offline"));

  await sync.syncDueAccounts();

  expect((await storedAccount()).nextSyncAt!.getTime()).toBeLessThanOrEqual(
    Date.now() + minutes(360),
  );
});

test("pauses after repeatedly rejected logins", async () => {
  const rejected = Object.assign(new Error("rejected"), { authenticationFailed: true });
  readNewMail.mockRejectedValue(rejected);

  await connectAccount({ syncFailures: 1 });
  await sync.syncDueAccounts();
  expect((await storedAccount()).nextSyncAt).not.toBeNull();

  await db.update(mailAccounts).set({ nextSyncAt: new Date(Date.now() - 1000) });
  await sync.syncDueAccounts();

  const account = await storedAccount();
  expect(account.syncError).toBe("loginRejected");
  expect(account.nextSyncAt).toBeNull();
});

test("asks for the password again when it can't be decrypted", async () => {
  await connectAccount({ encryptedPassword: "v1.broken" });

  await sync.syncDueAccounts();

  expect(readNewMail).not.toHaveBeenCalled();
  expect(log.error).toHaveBeenCalled();
  expect(await storedAccount()).toMatchObject({ syncError: "loginRejected", nextSyncAt: null });
});

test("does not overwrite an access changed during the sync", async () => {
  await connectAccount({ accessUpdatedAt: new Date("2026-01-01T00:00:00.000Z") });
  readNewMail.mockImplementation(async () => {
    await db
      .update(mailAccounts)
      .set({ host: "mail.example.org", accessUpdatedAt: new Date(), cursors: {} });
    return { cursors, hasMore: false };
  });

  await sync.syncDueAccounts();

  expect((await storedAccount()).cursors).toEqual({});
});

test("removes emails stored for an account deleted during the sync", async () => {
  await connectAccount();
  readNewMail.mockImplementation(async (_access, _cursors, onMail) => {
    await db.delete(mailAccounts);
    await onMail({ folder: "inbox", source: rawMail("a@example.com") });
    return { cursors, hasMore: false };
  });

  await sync.syncDueAccounts();

  expect(await db.select().from(mailMessages)).toEqual([]);
});

test("deletes only pending emails after the retention period", async () => {
  const old = new Date(Date.now() - 31 * 24 * minutes(60));
  const content = { subject: "", from: "", to: "", sentAt: null, body: "", attachmentCount: 0 };
  await db.insert(mailMessages).values([
    { userId, messageIdHash: "old", folder: "inbox", content, createdAt: old },
    { userId, messageIdHash: "recent", folder: "inbox", content },
    { userId, messageIdHash: "handled", folder: "inbox", status: "dismissed", createdAt: old },
  ]);

  await sync.syncDueAccounts();

  const hashes = (await db.select().from(mailMessages)).map(({ messageIdHash }) => messageIdHash);
  expect(hashes.sort()).toEqual(["handled", "recent"]);
});

test("stops between accounts when asked to", async () => {
  await connectAccount();

  await sync.syncDueAccounts(() => true);

  expect(readNewMail).not.toHaveBeenCalled();
});
