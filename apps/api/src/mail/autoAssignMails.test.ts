import { eq } from "drizzle-orm";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import {
  activities,
  applications,
  jobs,
  mailAssignments,
  mailMessages,
  type MailContent,
} from "../db/schema.ts";
import { createTestDatabase } from "../testDatabase.ts";
import { failingModel, respondingModel } from "../testLanguageModel.ts";
import { createMailAutoAssigner } from "./autoAssignMails.ts";

const db = await createTestDatabase();
const userId = "user-id";
const loadLanguageModel = vi.fn();
const log = { warn: vi.fn(), error: vi.fn() };
const assignNewMails = createMailAutoAssigner({ db, loadLanguageModel, log: log as never });

const content: MailContent = {
  subject: "Einladung",
  from: "hr@acme.example",
  to: "bewerbung@example.com",
  sentAt: "2026-11-02T08:14:00.000Z",
  body: "<p>Wir laden Sie ein.</p>",
  attachmentCount: 0,
};

beforeEach(async () => {
  await db.delete(mailAssignments);
  await db.delete(mailMessages);
  await db.delete(activities);
  await db.delete(applications);
  await db.delete(jobs);
  loadLanguageModel.mockReset().mockResolvedValue(undefined);
  log.warn.mockClear();
});

async function storedApplication({
  owner = userId,
  company = "Acme",
  position = "Developer",
} = {}) {
  const [job] = await db
    .insert(jobs)
    .values({ userId: owner, description: "", summary: "", company, position })
    .returning();
  const [application] = await db
    .insert(applications)
    .values({ userId: owner, jobId: job!.id, status: "applied", company, position })
    .returning();
  return application!;
}

let nextHash = 0;

async function storedMessage(values: Partial<typeof mailMessages.$inferInsert> = {}) {
  const [message] = await db
    .insert(mailMessages)
    .values({
      userId,
      messageIdHash: `hash-${nextHash++}`,
      folder: "inbox",
      content,
      ...values,
    })
    .returning();
  return message!;
}

async function link(applicationId: string, messageIdHash: string, sender = "other@acme.example") {
  await db.insert(mailAssignments).values({ userId, messageIdHash, sender, applicationId });
}

async function reloaded(id: string) {
  const [message] = await db.select().from(mailMessages).where(eq(mailMessages.id, id));
  return message!;
}

function modelAnswering(answer: object) {
  loadLanguageModel.mockResolvedValue({
    model: respondingModel(JSON.stringify(answer)),
    language: "de",
  });
}

test("assigns a reply to the application of its thread without AI", async () => {
  const application = await storedApplication();
  await link(application.id, "thread-start");
  const message = await storedMessage({ referencedHashes: ["unknown", "thread-start"] });

  await assignNewMails({ userId, aiAssignment: false });

  const stored = await reloaded(message.id);
  expect(stored).toMatchObject({ status: "autoAssigned", applicationId: application.id });
  expect(stored.classifiedAt).not.toBeNull();
  const [activity] = await db.select().from(activities);
  expect(activity).toMatchObject({
    id: stored.activityId,
    applicationId: application.id,
    type: "other",
    automatic: true,
    terms: null,
  });
  expect(activity!.occurredAt.toISOString()).toBe(content.sentAt);
  expect(activity!.attachments).toMatchObject([{ kind: "email", subject: "Einladung" }]);
  expect(loadLanguageModel).not.toHaveBeenCalled();
});

test("remembers an assigned email, so that replies to it are found after its deletion", async () => {
  const application = await storedApplication();
  await link(application.id, "thread-start");
  const reply = await storedMessage({
    messageIdHash: "reply",
    referencedHashes: ["thread-start"],
  });
  await assignNewMails({ userId, aiAssignment: false });
  await db.delete(mailMessages).where(eq(mailMessages.id, reply.id));

  const nextReply = await storedMessage({
    content: { ...content, from: "someone@else.example" },
    referencedHashes: ["reply"],
  });
  await assignNewMails({ userId, aiAssignment: false });

  expect(await reloaded(nextReply.id)).toMatchObject({ applicationId: application.id });
});

test("assigns an email of a sender known from exactly one application", async () => {
  const application = await storedApplication();
  await link(application.id, "earlier", "hr@acme.example");
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: false });

  expect(await reloaded(message.id)).toMatchObject({
    status: "autoAssigned",
    applicationId: application.id,
  });
});

test("matches a sent email by its recipient", async () => {
  const application = await storedApplication();
  await link(application.id, "earlier", "bewerbung@acme.example");
  const message = await storedMessage({
    folder: "sent",
    content: {
      ...content,
      from: "me@example.com",
      to: "bewerbung@acme.example, copy@example.com",
    },
  });

  await assignNewMails({ userId, aiAssignment: false });

  expect(await reloaded(message.id)).toMatchObject({ applicationId: application.id });
});

test("does not assign an email of a sender known from several applications", async () => {
  const first = await storedApplication();
  const second = await storedApplication({ position: "Designer" });
  await link(first.id, "one", "hr@acme.example");
  await link(second.id, "two", "hr@acme.example");
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: false });

  const stored = await reloaded(message.id);
  expect(stored).toMatchObject({ status: "pending", applicationId: null });
  expect(stored.classifiedAt).not.toBeNull();
});

test.each(["noreply@personio.de", "jobs@acme.softgarden.io", "x@acme.greenhouse.io"])(
  "does not trust the shared sender %s",
  async (sender) => {
    const application = await storedApplication();
    await link(application.id, "earlier", sender);
    const message = await storedMessage({ content: { ...content, from: sender } });

    await assignNewMails({ userId, aiAssignment: false });

    expect(await reloaded(message.id)).toMatchObject({ status: "pending" });
  },
);

test("does not use the assignments of other users", async () => {
  const foreign = await storedApplication({ owner: "other-user-id" });
  await db.insert(mailAssignments).values({
    userId: "other-user-id",
    messageIdHash: "thread-start",
    sender: "hr@acme.example",
    applicationId: foreign.id,
  });
  const message = await storedMessage({ referencedHashes: ["thread-start"] });

  await assignNewMails({ userId, aiAssignment: false });

  expect(await reloaded(message.id)).toMatchObject({ status: "pending", applicationId: null });
});

test("does not ask the model without the consent of the user", async () => {
  await storedApplication();
  modelAnswering({
    category: "unclear",
    applicationNumber: 0,
    activityType: "other",
    confident: true,
  });
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: false });

  expect(loadLanguageModel).not.toHaveBeenCalled();
  expect(await reloaded(message.id)).toMatchObject({ status: "pending" });
});

test("assigns an email when the model is confident", async () => {
  const older = await storedApplication({ company: "Other" });
  await db
    .update(applications)
    .set({ createdAt: new Date("2026-01-01T00:00:00.000Z") })
    .where(eq(applications.id, older.id));
  const application = await storedApplication();
  modelAnswering({
    category: "application",
    applicationNumber: 1,
    activityType: "interviewScheduled",
    confident: true,
  });
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: true });

  expect(await reloaded(message.id)).toMatchObject({
    status: "autoAssigned",
    suggestion: null,
  });
  const [activity] = await db.select().from(activities);
  expect(activity).toMatchObject({ type: "interviewScheduled", automatic: true });
  expect(activity!.applicationId).toBe(application.id);
  const [updated] = await db.select().from(applications).where(eq(applications.id, application.id));
  expect(updated!.status).toBe("interviewing");
});

test("only suggests the application when the model is unsure", async () => {
  const application = await storedApplication();
  modelAnswering({
    category: "application",
    applicationNumber: 1,
    activityType: "rejectionReceived",
    confident: false,
  });
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: true });

  expect(await reloaded(message.id)).toMatchObject({
    status: "pending",
    suggestion: { applicationId: application.id, activityType: "rejectionReceived" },
  });
  expect(await db.select().from(activities)).toEqual([]);
});

test("ignores an application number that wasn't offered", async () => {
  await storedApplication();
  modelAnswering({
    category: "application",
    applicationNumber: 7,
    activityType: "offerAccepted",
    confident: true,
  });
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: true });

  expect(await reloaded(message.id)).toMatchObject({ status: "pending", suggestion: null });
  expect(await db.select().from(activities)).toEqual([]);
});

test("dismisses an email the model is sure is irrelevant", async () => {
  await storedApplication();
  modelAnswering({
    category: "irrelevant",
    applicationNumber: 0,
    activityType: "other",
    confident: true,
  });
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: true });

  expect(await reloaded(message.id)).toMatchObject({ status: "dismissed" });
});

test.each([
  { category: "irrelevant", applicationNumber: 0, activityType: "other", confident: false },
  { category: "unclear", applicationNumber: 0, activityType: "other", confident: true },
])("keeps an email for review when the model answers %j", async (answer) => {
  await storedApplication();
  modelAnswering(answer);
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: true });

  const stored = await reloaded(message.id);
  expect(stored.status).toBe("pending");
  expect(stored.classifiedAt).not.toBeNull();
});

test("offers the model only the known application and uses its activity type", async () => {
  await storedApplication({ company: "Other" });
  const application = await storedApplication();
  await link(application.id, "thread-start");
  modelAnswering({
    category: "application",
    applicationNumber: 1,
    activityType: "offerReceived",
    confident: true,
  });
  await storedMessage({ referencedHashes: ["thread-start"] });

  await assignNewMails({ userId, aiAssignment: true });

  const [activity] = await db.select().from(activities);
  expect(activity).toMatchObject({ applicationId: application.id, type: "offerReceived" });
});

test("does not let an unsure model change the type or the application of a known thread", async () => {
  const application = await storedApplication();
  await link(application.id, "thread-start");
  modelAnswering({
    category: "application",
    applicationNumber: 1,
    activityType: "rejectionReceived",
    confident: false,
  });
  await storedMessage({ referencedHashes: ["thread-start"] });

  await assignNewMails({ userId, aiAssignment: true });

  const [activity] = await db.select().from(activities);
  expect(activity).toMatchObject({ applicationId: application.id, type: "other" });
});

test("still assigns a known thread when the provider fails", async () => {
  const application = await storedApplication();
  await link(application.id, "thread-start");
  loadLanguageModel.mockResolvedValue({ model: failingModel(500), language: "de" });
  const message = await storedMessage({ referencedHashes: ["thread-start"] });

  await assignNewMails({ userId, aiAssignment: true });

  expect(await reloaded(message.id)).toMatchObject({
    status: "autoAssigned",
    applicationId: application.id,
  });
});

test("tries an unknown email again when the provider fails", async () => {
  await storedApplication();
  loadLanguageModel.mockResolvedValue({ model: failingModel(500), language: "de" });
  const message = await storedMessage();

  expect(await assignNewMails({ userId, aiAssignment: true })).toBe(false);

  const stored = await reloaded(message.id);
  expect(stored).toMatchObject({ status: "pending", classifiedAt: null });
  expect(log.warn).toHaveBeenCalled();
});

test("handles emails without an AI access like without consent", async () => {
  const message = await storedMessage();

  await assignNewMails({ userId, aiAssignment: true });

  expect((await reloaded(message.id)).classifiedAt).not.toBeNull();
});

test("looks at each email only once", async () => {
  const message = await storedMessage({ classifiedAt: new Date() });
  const application = await storedApplication();
  await link(application.id, "earlier", "hr@acme.example");

  await assignNewMails({ userId, aiAssignment: false });

  expect(await reloaded(message.id)).toMatchObject({ status: "pending" });
});

test("works through a backlog in batches", async () => {
  for (let count = 0; count < 11; count++) await storedMessage();

  expect(await assignNewMails({ userId, aiAssignment: false })).toBe(true);
  expect(await assignNewMails({ userId, aiAssignment: false })).toBe(false);
});
