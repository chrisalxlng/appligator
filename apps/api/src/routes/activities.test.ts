import type { ActivityInput, JobInput } from "@appligator/shared";
import { beforeEach, expect, test } from "vite-plus/test";
import { applications, jobs } from "../db/schema.ts";
import { buildTestApp, signToken } from "../testAuth.ts";
import { createTestDatabase } from "../testDatabase.ts";

const db = await createTestDatabase();
const app = buildTestApp({ db });

const jobInput: JobInput = {
  link: null,
  description: "",
  summary: "",
  company: "Randstad Digital Germany AG",
  position: "Lead Developer Frontend",
  applicationDeadline: null,
  companyType: null,
  employeeCount: null,
  salary: null,
  bonuses: [],
  benefits: [],
  employmentType: null,
  workModel: null,
  homeOfficePercentage: null,
  workingHours: null,
  locations: [],
  commuteDistance: null,
  commuteDuration: null,
  vacationDays: null,
  startDate: null,
  contractTerm: null,
  probationMonths: null,
  noticePeriod: null,
  notes: "",
};

const activityInput: ActivityInput = {
  type: "applicationSubmitted",
  occurredAt: "2026-10-17T08:00:00.000Z",
  terms: null,
  appointmentAt: null,
  dueDate: null,
  responseDeadline: null,
  notes: "",
  attachments: [],
};

const {
  link: _link,
  description: _description,
  summary: _summary,
  company: _company,
  applicationDeadline: _applicationDeadline,
  notes: _notes,
  ...jobTerms
} = jobInput;

const offer: ActivityInput = {
  ...activityInput,
  type: "offerReceived",
  occurredAt: "2026-10-30T14:30:00.000Z",
  terms: {
    ...jobTerms,
    salary: { currency: "EUR", period: "year", min: 70_000, max: 70_000 },
    homeOfficePercentage: 80,
  },
  responseDeadline: "2026-11-30",
  notes: "<p>Training budget</p>",
  attachments: [
    { kind: "link", url: "https://randstad-digital.de/offer", title: "Unser Angebot an dich" },
  ],
};

beforeEach(async () => {
  await db.delete(applications);
  await db.delete(jobs);
});

async function request(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  { body, userId = "user-id" }: { body?: unknown; userId?: string } = {},
) {
  return app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${await signToken({ sub: userId })}` },
    ...(body === undefined ? {} : { payload: body as object }),
  });
}

async function createApplication(userId?: string) {
  const job = (await request("POST", "/jobs", { body: jobInput, userId })).json();
  const application = (
    await request("POST", "/applications", {
      body: { jobId: job.id, activity: activityInput },
      userId,
    })
  ).json();
  return application.id as string;
}

async function listActivities(applicationId: string) {
  return (await request("GET", `/applications/${applicationId}/activities`)).json();
}

test("POST /applications/:id/activities adds an activity with its fields", async () => {
  const applicationId = await createApplication();

  const response = await request("POST", `/applications/${applicationId}/activities`, {
    body: offer,
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toEqual({
    ...offer,
    id: expect.any(String),
    detailsReviewed: false,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  });
});

test("POST /applications/:id/activities stores email and file attachments, emails without recipient included", async () => {
  const applicationId = await createApplication();
  const attachments = [
    {
      kind: "email",
      subject: "Unser Angebot an dich",
      from: "hr@randstad-digital.de",
      sentAt: "2026-10-30T09:00:00.000Z",
      body: "<p>Hallo</p>",
    },
    {
      kind: "file",
      fileId: "6a1f0e3c-2b4d-4c5e-8f9a-0b1c2d3e4f5a",
      title: "CV",
      name: "Lebenslauf.pdf",
      mimeType: "application/pdf",
    },
  ];

  const response = await request("POST", `/applications/${applicationId}/activities`, {
    body: { ...activityInput, attachments },
  });

  expect(response.statusCode).toBe(201);
  expect(response.json().attachments).toEqual([{ ...attachments[0], to: "" }, attachments[1]]);
});

test("POST /applications/:id/activities takes over terms into empty details only", async () => {
  const applicationId = await createApplication();
  await request("POST", `/applications/${applicationId}/activities`, { body: offer });
  const otherSalary = {
    currency: "EUR" as const,
    period: "year" as const,
    min: 90_000,
    max: 90_000,
  };

  await request("POST", `/applications/${applicationId}/activities`, {
    body: { ...offer, terms: { ...offer.terms!, salary: otherSalary, vacationDays: 30 } },
  });

  expect((await request("GET", `/applications/${applicationId}`)).json()).toMatchObject({
    position: "Lead Developer Frontend",
    salary: offer.terms!.salary,
    homeOfficePercentage: 80,
    vacationDays: 30,
    bonuses: [],
  });
});

test("PUT /applications/:id/activities/:activityId takes over terms into empty details", async () => {
  const applicationId = await createApplication();
  const [submission] = await listActivities(applicationId);

  await request("PUT", `/applications/${applicationId}/activities/${submission.id}`, {
    body: { ...activityInput, terms: { ...offer.terms!, salary: null } },
  });

  expect((await request("GET", `/applications/${applicationId}`)).json()).toMatchObject({
    salary: null,
    homeOfficePercentage: 80,
  });
});

test("GET /applications/:id/activities lists the activities, latest first", async () => {
  const applicationId = await createApplication();
  await request("POST", `/applications/${applicationId}/activities`, { body: offer });
  await request("POST", `/applications/${applicationId}/activities`, {
    body: { ...activityInput, type: "receiptConfirmed", occurredAt: "2026-10-18T08:00:00.000Z" },
  });

  const types = (await listActivities(applicationId)).map(({ type }: { type: string }) => type);

  expect(types).toEqual(["offerReceived", "receiptConfirmed", "applicationSubmitted"]);
});

test.each([
  ["a field the type does not have", { ...activityInput, type: "other", dueDate: "2026-11-09" }],
  ["an unknown type", { ...activityInput, type: "unknown" }],
  [
    "a link that is no web address",
    { ...offer, attachments: [{ kind: "link", url: "ftp://x", title: "" }] },
  ],
])("POST /applications/:id/activities rejects %s", async (_, body) => {
  const applicationId = await createApplication();

  const response = await request("POST", `/applications/${applicationId}/activities`, { body });

  expect(response.statusCode).toBe(400);
});

test("PUT /applications/:id/activities/:activityId changes the activity", async () => {
  const applicationId = await createApplication();
  const [submission] = await listActivities(applicationId);
  const changed = {
    ...activityInput,
    occurredAt: "2026-10-16T12:00:00.000Z",
    notes: "<p>Mail</p>",
  };

  const response = await request(
    "PUT",
    `/applications/${applicationId}/activities/${submission.id}`,
    { body: changed },
  );

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject(changed);
  expect((await request("GET", `/applications/${applicationId}`)).json()).toMatchObject({
    appliedAt: "2026-10-16T12:00:00.000Z",
  });
});

async function addOffer(applicationId: string) {
  return (
    await request("POST", `/applications/${applicationId}/activities`, { body: offer })
  ).json();
}

async function review(applicationId: string, activityId: string) {
  return request("PUT", `/applications/${applicationId}/activities/${activityId}/details-review`);
}

test("PUT /applications/:id/activities/:activityId/details-review marks the terms as reviewed", async () => {
  const applicationId = await createApplication();
  const { id } = await addOffer(applicationId);

  expect((await review(applicationId, id)).statusCode).toBe(204);

  const [reviewed] = await listActivities(applicationId);
  expect(reviewed).toMatchObject({ id, detailsReviewed: true });
});

test("PUT /applications/:id/activities/:activityId keeps the review unless the terms change", async () => {
  const applicationId = await createApplication();
  const { id } = await addOffer(applicationId);
  await review(applicationId, id);
  const path = `/applications/${applicationId}/activities/${id}`;

  const withNotes = await request("PUT", path, { body: { ...offer, notes: "<p>Call HR</p>" } });
  expect(withNotes.json()).toMatchObject({ detailsReviewed: true });

  const changedTerms = { ...offer, terms: { ...offer.terms!, vacationDays: 28 } };
  expect((await request("PUT", path, { body: changedTerms })).json()).toMatchObject({
    detailsReviewed: false,
  });
});

test("DELETE /applications/:id/activities/:activityId deletes the activity", async () => {
  const applicationId = await createApplication();
  const [submission] = await listActivities(applicationId);

  const response = await request(
    "DELETE",
    `/applications/${applicationId}/activities/${submission.id}`,
  );

  expect(response.statusCode).toBe(204);
  expect(await listActivities(applicationId)).toEqual([]);
  expect((await request("GET", `/applications/${applicationId}`)).json()).toMatchObject({
    appliedAt: null,
  });
});

test("DELETE /applications/:id deletes the activities of the application", async () => {
  const applicationId = await createApplication();

  await request("DELETE", `/applications/${applicationId}`);

  expect((await request("GET", `/applications/${applicationId}/activities`)).statusCode).toBe(404);
});

test.each([
  ["GET", "", undefined],
  ["POST", "", activityInput],
  ["PUT", "/:activityId", activityInput],
  ["DELETE", "/:activityId", undefined],
  ["PUT", "/:activityId/details-review", undefined],
] as const)(
  "%s /applications/:id/activities%s does not reveal activities of other users",
  async (method, path, body) => {
    const applicationId = await createApplication("other-user");
    const [submission] = (
      await request("GET", `/applications/${applicationId}/activities`, { userId: "other-user" })
    ).json();

    const response = await request(
      method,
      `/applications/${applicationId}/activities${path.replace(":activityId", submission.id)}`,
      { body },
    );

    expect(response.statusCode).toBe(404);
    expect(
      (await request("GET", `/applications/${applicationId}/activities`, { userId: "other-user" }))
        .json()
        .map(({ notes }: { notes: string }) => notes),
    ).toEqual([""]);
  },
);

test("PUT /applications/:id/activities/:activityId does not change activities of other applications", async () => {
  const applicationId = await createApplication();
  const otherApplicationId = await createApplication();
  const [submission] = await listActivities(otherApplicationId);

  const response = await request(
    "PUT",
    `/applications/${applicationId}/activities/${submission.id}`,
    { body: offer },
  );

  expect(response.statusCode).toBe(404);
});
