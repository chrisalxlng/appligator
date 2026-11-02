import { eq } from "drizzle-orm";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { activities, applications, jobs, mailAccounts, mailMessages } from "../db/schema.ts";
import type { VerifyMailAccess } from "../mail/mailAccess.ts";
import type { ReadNewMail } from "../mail/mailReader.ts";
import { buildTestApp, signToken, testMailPasswordCipher } from "../testAuth.ts";
import { createTestDatabase } from "../testDatabase.ts";

const db = await createTestDatabase();
const verifyMailAccess = vi.fn<VerifyMailAccess>();
const readNewMail = vi.fn<ReadNewMail>();
let app: ReturnType<typeof buildTestApp>;

const input = {
  host: "imap.example.com",
  username: "bewerbung@example.com",
  password: " app password ",
};

beforeEach(async () => {
  // The rate limit of the connection checks counts per app instance.
  app = buildTestApp({ db, mail: { verifyMailAccess, readNewMail } });
  await db.delete(mailAccounts);
  await db.delete(mailMessages);
  await db.delete(activities);
  await db.delete(applications);
  await db.delete(jobs);
  verifyMailAccess.mockReset().mockResolvedValue(undefined);
  readNewMail.mockReset();
});

async function request(
  method: "GET" | "POST" | "PUT" | "DELETE",
  {
    body,
    userId = "user-id",
    url = "/mail/account",
  }: { body?: object; userId?: string; url?: string } = {},
) {
  return app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${await signToken({ sub: userId })}` },
    ...(body && { payload: body }),
  });
}

async function storedRow(userId = "user-id") {
  const [row] = await db.select().from(mailAccounts).where(eq(mailAccounts.userId, userId));
  return row;
}

test("GET /mail/account returns null without an account", async () => {
  const response = await request("GET");

  expect(response.statusCode).toBe(200);
  expect(response.json()).toBeNull();
});

test("PUT /mail/account verifies and stores the access without returning the password", async () => {
  const response = await request("PUT", { body: input });

  expect(response.statusCode).toBe(200);
  expect(verifyMailAccess).toHaveBeenCalledWith(input);
  expect(response.json()).toEqual({
    host: "imap.example.com",
    username: "bewerbung@example.com",
    accessUpdatedAt: expect.any(String),
    lastSyncedAt: null,
    syncError: null,
  });
  expect(response.body).not.toContain("app password");

  const row = await storedRow();
  expect(row!.encryptedPassword).not.toContain("app password");
  expect(testMailPasswordCipher.decrypt(row!.encryptedPassword, "user-id")).toBe(" app password ");
});

test("PUT /mail/account normalizes the host", async () => {
  await request("PUT", { body: { ...input, host: " IMAP.Example.COM " } });

  expect((await storedRow())!.host).toBe("imap.example.com");
});

test.each(["127.0.0.1", "[::1]", "imap.example.com:143", "imap.example.com.", "", "imap_.test"])(
  "PUT /mail/account rejects the host %j without connecting",
  async (host) => {
    const response = await request("PUT", { body: { ...input, host } });

    expect(response.statusCode).toBe(400);
    expect(verifyMailAccess).not.toHaveBeenCalled();
  },
);

test("PUT /mail/account requires a password", async () => {
  const { password: _password, ...withoutPassword } = input;

  const response = await request("PUT", { body: withoutPassword });

  expect(response.statusCode).toBe(400);
  expect(verifyMailAccess).not.toHaveBeenCalled();
});

test.each(["loginRejected", "connectionFailed"] as const)(
  "PUT /mail/account does not store an access that fails with %s",
  async (error) => {
    verifyMailAccess.mockResolvedValue(error);

    const response = await request("PUT", { body: input });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ error });
    expect(await storedRow()).toBeUndefined();
  },
);

test("PUT /mail/account keeps the stored access when the new one fails", async () => {
  await request("PUT", { body: input });
  verifyMailAccess.mockResolvedValue("loginRejected");

  await request("PUT", { body: { ...input, username: "other@example.com" } });

  expect((await storedRow())!.username).toBe("bewerbung@example.com");
});

test("PUT /mail/account replaces the stored access", async () => {
  await request("PUT", { body: input });

  const response = await request("PUT", {
    body: { host: "mail.example.org", username: "other@example.org", password: "new" },
  });

  expect(response.json()).toMatchObject({
    host: "mail.example.org",
    username: "other@example.org",
  });
  expect(await db.select().from(mailAccounts)).toHaveLength(1);
  expect(testMailPasswordCipher.decrypt((await storedRow())!.encryptedPassword, "user-id")).toBe(
    "new",
  );
});

test("accounts are separated by user", async () => {
  await request("PUT", { body: input });

  expect((await request("GET", { userId: "other-user-id" })).json()).toBeNull();
  expect((await request("DELETE", { userId: "other-user-id" })).statusCode).toBe(404);
  expect(await storedRow()).toBeDefined();
});

test("DELETE /mail/account removes the stored access", async () => {
  await request("PUT", { body: input });

  const response = await request("DELETE");

  expect(response.statusCode).toBe(204);
  expect(await storedRow()).toBeUndefined();
});

test("DELETE /mail/account responds with 404 without an account", async () => {
  expect((await request("DELETE")).statusCode).toBe(404);
});

test("PUT /mail/account limits how often connections are attempted", async () => {
  const attempt = () => request("PUT", { body: input });

  for (let count = 0; count < 10; count++) expect((await attempt()).statusCode).toBe(200);

  expect((await attempt()).statusCode).toBe(429);
});

test("PUT /mail/account keeps the position in the mailbox when only the password changes", async () => {
  await request("PUT", { body: input });
  const cursors = { inbox: { uidValidity: "7", lastUid: 3 } };
  await db
    .update(mailAccounts)
    .set({ cursors, syncError: "loginRejected", syncFailures: 3, nextSyncAt: null });

  await request("PUT", { body: { ...input, password: "new" } });

  const row = await storedRow();
  expect(row).toMatchObject({ cursors, syncError: null, syncFailures: 0 });
  expect(row!.nextSyncAt).not.toBeNull();
});

test.each([{ host: "mail.example.org" }, { username: "other@example.com" }])(
  "PUT /mail/account starts over in another mailbox: %j",
  async (change) => {
    await request("PUT", { body: input });
    await db.update(mailAccounts).set({ cursors: { inbox: { uidValidity: "7", lastUid: 3 } } });

    await request("PUT", { body: { ...input, ...change } });

    expect((await storedRow())!.cursors).toEqual({});
  },
);

const content = {
  subject: "Invitation",
  from: "jobs@acme.example",
  to: "bewerbung@example.com",
  sentAt: "2026-11-02T08:14:00.000Z",
  body: "<p>Hello</p>",
  attachmentCount: 2,
};

async function storedMessage({ userId = "user-id", hash = "hash" } = {}) {
  const [message] = await db
    .insert(mailMessages)
    .values({ userId, messageIdHash: hash, folder: "inbox", content })
    .returning();
  return message!;
}

async function storedApplication(userId = "user-id") {
  const [job] = await db
    .insert(jobs)
    .values({ userId, description: "", summary: "", company: "Acme", position: "Developer" })
    .returning();
  const [application] = await db
    .insert(applications)
    .values({
      userId,
      jobId: job!.id,
      status: "applied",
      company: "Acme",
      position: "Developer",
    })
    .returning();
  return application!;
}

const activity = {
  type: "interviewScheduled",
  occurredAt: "2026-11-02T08:14:00.000Z",
  terms: null,
  appointmentAt: null,
  dueDate: null,
  responseDeadline: null,
  notes: "",
  attachments: [
    {
      kind: "email",
      subject: content.subject,
      from: content.from,
      to: content.to,
      sentAt: content.sentAt,
      body: content.body,
    },
  ],
};

test("GET /mail/messages lists the pending emails of the user without their bodies", async () => {
  const message = await storedMessage();
  await storedMessage({ userId: "other-user-id" });
  const [dismissed] = await db
    .insert(mailMessages)
    .values({ userId: "user-id", messageIdHash: "dismissed", folder: "inbox", status: "dismissed" })
    .returning();

  const response = await request("GET", { url: "/mail/messages" });

  expect(response.statusCode).toBe(200);
  const { body: _body, ...listed } = content;
  expect(response.json()).toEqual({
    items: [{ ...listed, id: message.id, folder: "inbox", receivedAt: expect.any(String) }],
    total: 1,
  });
  expect(response.body).not.toContain(dismissed!.id);
});

test("GET /mail/messages/count counts the pending emails of the user", async () => {
  await storedMessage();
  await storedMessage({ hash: "other" });
  await storedMessage({ userId: "other-user-id" });

  const response = await request("GET", { url: "/mail/messages/count" });

  expect(response.json()).toEqual({ count: 2 });
});

test("GET /mail/messages/:id returns an own pending email with its body", async () => {
  const message = await storedMessage();
  const foreign = await storedMessage({ userId: "other-user-id" });

  const response = await request("GET", { url: `/mail/messages/${message.id}` });

  expect(response.json()).toMatchObject({ id: message.id, body: "<p>Hello</p>" });
  expect((await request("GET", { url: `/mail/messages/${foreign.id}` })).statusCode).toBe(404);
});

test("POST /mail/messages/:id/assignment creates the activity and clears the email", async () => {
  const message = await storedMessage();
  const application = await storedApplication();

  const response = await request("POST", {
    url: `/mail/messages/${message.id}/assignment`,
    body: { applicationId: application.id, activity },
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
    type: "interviewScheduled",
    attachments: [{ kind: "email", subject: "Invitation" }],
  });
  const [stored] = await db.select().from(mailMessages).where(eq(mailMessages.id, message.id));
  expect(stored).toMatchObject({ status: "assigned", content: null });
  const [updated] = await db.select().from(applications).where(eq(applications.id, application.id));
  expect(updated!.status).toBe("interviewing");
  expect((await request("GET", { url: "/mail/messages/count" })).json()).toEqual({ count: 0 });
});

test("POST /mail/messages/:id/assignment rejects a foreign application", async () => {
  const message = await storedMessage();
  const application = await storedApplication("other-user-id");

  const response = await request("POST", {
    url: `/mail/messages/${message.id}/assignment`,
    body: { applicationId: application.id, activity },
  });

  expect(response.statusCode).toBe(404);
  expect(await db.select().from(activities)).toEqual([]);
  expect((await request("GET", { url: "/mail/messages/count" })).json()).toEqual({ count: 1 });
});

test("POST /mail/messages/:id/assignment assigns an email only once and only an own one", async () => {
  const message = await storedMessage();
  const foreign = await storedMessage({ userId: "other-user-id" });
  const application = await storedApplication();
  const assign = (id: string) =>
    request("POST", {
      url: `/mail/messages/${id}/assignment`,
      body: { applicationId: application.id, activity },
    });

  expect((await assign(foreign.id)).statusCode).toBe(404);
  expect((await assign(message.id)).statusCode).toBe(201);
  expect((await assign(message.id)).statusCode).toBe(404);
  expect(await db.select().from(activities)).toHaveLength(1);
});

test("DELETE /mail/messages/:id dismisses an own email and clears its content", async () => {
  const message = await storedMessage();
  const foreign = await storedMessage({ userId: "other-user-id" });

  expect((await request("DELETE", { url: `/mail/messages/${foreign.id}` })).statusCode).toBe(404);
  expect((await request("DELETE", { url: `/mail/messages/${message.id}` })).statusCode).toBe(204);

  const [stored] = await db.select().from(mailMessages).where(eq(mailMessages.id, message.id));
  expect(stored).toMatchObject({ status: "dismissed", content: null });
  expect((await request("DELETE", { url: `/mail/messages/${message.id}` })).statusCode).toBe(404);
});

test("DELETE /mail/account also removes the stored emails of the user only", async () => {
  await request("PUT", { body: input });
  await storedMessage();
  await storedMessage({ userId: "other-user-id" });

  await request("DELETE");

  const messages = await db.select().from(mailMessages);
  expect(messages.map(({ userId }) => userId)).toEqual(["other-user-id"]);
});

test("POST /mail/sync reads the mailbox of the user and reports the new emails", async () => {
  await request("PUT", { body: input });
  readNewMail.mockImplementation(async (_access, cursors, onMail) => {
    await onMail({
      folder: "inbox",
      source: Buffer.from("Message-ID: <a@example.com>\r\nSubject: Hello\r\n\r\nText"),
    });
    return { cursors, hasMore: false };
  });

  const response = await request("POST", { url: "/mail/sync" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ newMails: 1 });
  expect(readNewMail.mock.calls[0]![0]).toEqual(input);
  expect((await request("GET", { url: "/mail/messages/count" })).json()).toEqual({ count: 1 });
});

test("POST /mail/sync reports a failure and stores it", async () => {
  await request("PUT", { body: input });
  readNewMail.mockRejectedValue(new Error("offline"));

  const response = await request("POST", { url: "/mail/sync" });

  expect(response.statusCode).toBe(422);
  expect(response.json()).toEqual({ error: "connectionFailed" });
  expect((await request("GET")).json()).toMatchObject({ syncError: "connectionFailed" });
});

test("POST /mail/sync responds with 404 without an account of the user", async () => {
  await request("PUT", { body: input, userId: "other-user-id" });

  expect((await request("POST", { url: "/mail/sync" })).statusCode).toBe(404);
  expect(readNewMail).not.toHaveBeenCalled();
});

test("POST /mail/sync limits how often connections are attempted", async () => {
  await request("PUT", { body: input });
  readNewMail.mockImplementation(async (_access, cursors) => ({ cursors, hasMore: false }));
  const attempt = () => request("POST", { url: "/mail/sync" });

  for (let count = 0; count < 10; count++) expect((await attempt()).statusCode).toBe(200);

  expect((await attempt()).statusCode).toBe(429);
});
