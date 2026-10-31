import type { ApplicationInput, JobInput } from "@appligator/shared";
import { beforeEach, expect, test } from "vite-plus/test";
import { applications, jobs } from "../db/schema.ts";
import { buildTestApp, signToken } from "../testAuth.ts";
import { createTestDatabase } from "../testDatabase.ts";

const db = await createTestDatabase();
const app = buildTestApp({ db });

const jobInput: JobInput = {
  link: "https://www.stepstone.de/jobs/view/123",
  description: "<p>Description</p>",
  summary: "<p>Summary</p>",
  company: "Randstad Digital Germany AG",
  position: "Lead Developer Frontend",
  applicationDeadline: "2026-12-31",
  companyType: "corporation",
  employeeCount: 60_000,
  salary: { currency: "EUR", period: "year", min: 65_000, max: 75_000 },
  bonuses: ["13. Monatsgehalt"],
  benefits: ["Jobrad"],
  employmentType: "fullTime",
  workModel: "hybrid",
  homeOfficePercentage: 80,
  workingHours: { hours: 38.5, period: "week" },
  locations: ["Düsseldorf"],
  commuteDistance: 17,
  commuteDuration: 25,
  vacationDays: 30,
  startDate: "2027-02-01",
  contractTerm: { kind: "permanent" },
  probationMonths: 3,
  noticePeriod: { amount: 1, unit: "months", endOf: null },
  notes: "<p>Notes</p>",
};

const {
  link: _link,
  description: _description,
  summary: _summary,
  applicationDeadline: _applicationDeadline,
  ...inheritedInput
} = jobInput;

const changedInput: ApplicationInput = {
  ...inheritedInput,
  position: "Senior Developer Frontend",
  salary: null,
  bonuses: [],
  notes: "",
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

async function createJob(userId?: string, input: JobInput = jobInput) {
  return (await request("POST", "/jobs", { body: input, userId })).json();
}

async function apply(jobId: string, userId?: string) {
  return request("POST", "/applications", { body: { jobId, appliedAt: "2026-10-30" }, userId });
}

async function createApplication(userId?: string) {
  const job = await createJob(userId);
  return (await apply(job.id, userId)).json();
}

test("POST /applications applies to a job with its details", async () => {
  const job = await createJob();

  const response = await apply(job.id);

  expect(response.statusCode).toBe(201);
  expect(response.json()).toEqual({
    ...inheritedInput,
    id: expect.any(String),
    status: "applied",
    appliedAt: "2026-10-30",
    favorite: false,
    job: { id: job.id, position: "Lead Developer Frontend" },
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  });
});

test("POST /applications refuses a second application to the same job", async () => {
  const job = await createJob();
  await apply(job.id);

  const response = await apply(job.id);

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({ error: "alreadyApplied" });
});

test("POST /applications does not apply to jobs of other users", async () => {
  const job = await createJob("other-user");

  const response = await apply(job.id);

  expect(response.statusCode).toBe(404);
});

test.each([
  ["an invalid job id", { jobId: "not-a-uuid", appliedAt: "2026-10-30" }],
  ["an invalid date", { jobId: "00000000-0000-4000-8000-000000000000", appliedAt: "30.10.2026" }],
])("POST /applications rejects %s", async (_, body) => {
  const response = await request("POST", "/applications", { body });

  expect(response.statusCode).toBe(400);
});

test("GET /applications lists only the user's applications, newest first", async () => {
  const older = await createApplication();
  const newer = await createApplication();
  await createApplication("other-user");

  const response = await request("GET", "/applications");

  expect(response.json()).toEqual({
    items: [newer, older].map(({ id, company, position, status, favorite, createdAt }) => ({
      id,
      company,
      position,
      status,
      favorite,
      createdAt,
    })),
    nextCursor: null,
  });
});

test("GET /applications pages through the applications with a cursor", async () => {
  const [oldest, middle, newest] = [
    await createApplication(),
    await createApplication(),
    await createApplication(),
  ];

  const firstPage = (await request("GET", "/applications?limit=2")).json();
  const secondPage = (
    await request("GET", `/applications?limit=2&cursor=${firstPage.nextCursor}`)
  ).json();

  expect(firstPage.items.map(({ id }: { id: string }) => id)).toEqual([newest.id, middle.id]);
  expect(secondPage).toEqual({
    items: [expect.objectContaining({ id: oldest.id })],
    nextCursor: null,
  });
});

async function markFavorite(id: string, favorite = true, userId?: string) {
  return request("PUT", `/applications/${id}/favorite`, { body: { favorite }, userId });
}

test("GET /applications/counts counts the user's applications by status and favorites", async () => {
  const favorite = await createApplication();
  await createApplication();
  await markFavorite(favorite.id);
  await markFavorite((await createApplication("other-user")).id, true, "other-user");

  const response = await request("GET", "/applications/counts");

  expect(response.json()).toEqual({ statuses: [{ status: "applied", count: 2 }], favorites: 1 });
});

test("GET /applications/counts counts nothing without applications", async () => {
  expect((await request("GET", "/applications/counts")).json()).toEqual({
    statuses: [],
    favorites: 0,
  });
});

test("PUT /applications/:id/favorite marks and unmarks the application", async () => {
  const application = await createApplication();

  expect((await markFavorite(application.id)).statusCode).toBe(204);
  expect((await request("GET", `/applications/${application.id}`)).json()).toMatchObject({
    favorite: true,
  });

  await markFavorite(application.id, false);
  expect((await request("GET", `/applications/${application.id}`)).json()).toMatchObject({
    favorite: false,
  });
});

test("GET /applications filters the favorite applications", async () => {
  const favorite = await createApplication();
  await createApplication();
  await markFavorite(favorite.id);

  const { items } = (await request("GET", "/applications?favorite=true")).json();

  expect(items).toEqual([expect.objectContaining({ id: favorite.id, favorite: true })]);
});

test("POST /applications takes over the mark of the job", async () => {
  const job = await createJob();
  await request("PUT", `/jobs/${job.id}/favorite`, { body: { favorite: true } });

  const response = await apply(job.id);

  expect(response.json()).toMatchObject({ favorite: true });
});

test("GET /applications/:id returns the application", async () => {
  const application = await createApplication();

  const response = await request("GET", `/applications/${application.id}`);

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(application);
});

test("PUT /applications/:id changes the application but not the job", async () => {
  const application = await createApplication();

  const response = await request("PUT", `/applications/${application.id}`, {
    body: changedInput,
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    ...changedInput,
    appliedAt: "2026-10-30",
    job: { id: application.job.id, position: "Lead Developer Frontend" },
  });
  expect((await request("GET", `/jobs/${application.job.id}`)).json()).toMatchObject(jobInput);
});

test("PUT /applications/:id rejects an application without position", async () => {
  const application = await createApplication();

  const response = await request("PUT", `/applications/${application.id}`, {
    body: { ...changedInput, position: " " },
  });

  expect(response.statusCode).toBe(400);
});

test("DELETE /applications/:id deletes the application and reopens the job", async () => {
  const application = await createApplication();

  const response = await request("DELETE", `/applications/${application.id}`);

  expect(response.statusCode).toBe(204);
  expect((await request("GET", `/applications/${application.id}`)).statusCode).toBe(404);
  expect((await request("GET", `/jobs/${application.job.id}`)).json()).toMatchObject({
    status: "open",
    application: null,
  });
});

test.each([
  ["GET", "", undefined],
  ["PUT", "", changedInput],
  ["DELETE", "", undefined],
  ["PUT", "/favorite", { favorite: true }],
] as const)(
  "%s /applications/:id%s does not reveal applications of other users",
  async (method, path, body) => {
    const application = await createApplication("other-user");

    const response = await request(method, `/applications/${application.id}${path}`, { body });

    expect(response.statusCode).toBe(404);
    expect(
      (await request("GET", `/applications/${application.id}`, { userId: "other-user" })).json(),
    ).toEqual(application);
  },
);

test("requires authentication", async () => {
  const response = await app.inject({ method: "GET", url: "/applications" });

  expect(response.statusCode).toBe(401);
});
