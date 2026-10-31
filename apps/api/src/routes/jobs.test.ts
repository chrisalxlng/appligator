import type { JobInput, JobListPage } from "@appligator/shared";
import { eq, sql } from "drizzle-orm";
import { beforeEach, expect, test } from "vite-plus/test";
import { applications, jobs } from "../db/schema.ts";
import { toSalaryColumns } from "./salaryColumns.ts";
import { createTestDatabase } from "../testDatabase.ts";
import { buildTestApp, signToken } from "../testAuth.ts";

const db = await createTestDatabase();
const app = buildTestApp({ db });

const jobInput: JobInput = {
  link: "https://www.stepstone.de/jobs/view/123",
  description: "<h2>Einleitung</h2><p><strong>Randstad</strong></p>",
  summary: "<p>Frontend-Lead-Position</p>",
  company: "Randstad Digital Germany AG",
  position: "Lead Developer Frontend",
  companyType: "corporation",
  employeeCount: 60_000,
  salary: { currency: "EUR", period: "year", min: 65_000, max: 75_000 },
  bonuses: ["13. Monatsgehalt", "Erfolgsbeteiligung"],
  benefits: ["50 € Brutto-Netto-Auszahlung"],
  employmentType: "fullTime",
  workModel: "hybrid",
  homeOfficePercentage: 80,
  workingHours: { hours: 38.5, period: "week" },
  locations: ["Düsseldorf", "Hamburg"],
  commuteDistance: 17,
  commuteDuration: 25,
  vacationDays: 31.5,
  startDate: "2027-02-01",
  contractTerm: { kind: "until", date: "2028-01-31" },
  probationMonths: 3,
  noticePeriod: { amount: 4, unit: "weeks", endOf: "month" },
  notes: "<p>Jährliches Weiterbildungsbudget von 2.000 €</p>",
  applicationDeadline: "2026-12-31",
};

const emptyInput: JobInput = {
  link: null,
  description: "",
  summary: "",
  company: "Initech GmbH",
  position: "Frontend Developer",
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
  applicationDeadline: null,
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

async function createJob(input: JobInput = jobInput, userId?: string) {
  const response = await request("POST", "/jobs", { body: input, userId });
  return response.json();
}

async function applyTo(jobId: string) {
  const response = await request("POST", "/applications", {
    body: { jobId, appliedAt: "2026-10-30" },
  });
  return response.json();
}

test("POST /jobs creates a job", async () => {
  const response = await request("POST", "/jobs", { body: jobInput });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toEqual({
    ...jobInput,
    id: expect.any(String),
    status: "open",
    isNew: false,
    favorite: false,
    application: null,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  });
});

test("POST /jobs accepts a job with only company and position", async () => {
  const response = await request("POST", "/jobs", { body: emptyInput });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject(emptyInput);
});

test.each([
  ["a blank company", { company: "  " }],
  ["a blank location", { locations: [""] }],
  ["a link that is not http(s)", { link: "javascript:alert(1)" }],
  ["a minimum salary above the maximum", { salary: { ...jobInput.salary!, min: 80_000 } }],
  ["a negative salary", { salary: { ...jobInput.salary!, min: -1 } }],
  ["an unknown work model", { workModel: "office" }],
  ["an unknown company type", { companyType: "agency" }],
  ["no employees", { employeeCount: 0 }],
  ["an invalid deadline", { applicationDeadline: "31.12.2026" }],
  ["a blank bonus", { bonuses: [" "] }],
  ["a home office share above 100 percent", { homeOfficePercentage: 101 }],
  ["no working hours", { workingHours: { hours: 0, period: "week" } }],
  ["vacation days that are not whole or half days", { vacationDays: 30.25 }],
  ["a fixed-term contract without duration", { contractTerm: { kind: "months" } }],
  ["an unknown contract term", { contractTerm: { kind: "temporary" } }],
  ["too many months of notice", { noticePeriod: { amount: 1_201, unit: "months", endOf: null } }],
  ["too many weeks of notice", { noticePeriod: { amount: 521, unit: "weeks", endOf: null } }],
])("POST /jobs rejects %s", async (_, override) => {
  const response = await request("POST", "/jobs", { body: { ...jobInput, ...override } });

  expect(response.statusCode).toBe(400);
});

function toListItem({
  id,
  company,
  position,
  status,
  isNew,
  favorite,
  createdAt,
}: Record<string, unknown>) {
  return { id, company, position, status, isNew, favorite, createdAt };
}

async function insertJobs(count: number, createdAt: string) {
  return db
    .insert(jobs)
    .values(
      Array.from({ length: count }, () => ({
        ...toSalaryColumns(emptyInput),
        userId: "user-id",
        createdAt: sql`${createdAt}::timestamptz`,
      })),
    )
    .returning();
}

test("GET /jobs lists only the user's jobs, newest first", async () => {
  const older = await createJob(emptyInput);
  const newer = await createJob();
  await createJob(jobInput, "other-user");

  const response = await request("GET", "/jobs");

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ items: [newer, older].map(toListItem), nextCursor: null });
});

test("GET /jobs pages through the jobs with a cursor", async () => {
  const [oldest, middle, newest] = [await createJob(), await createJob(), await createJob()].map(
    toListItem,
  );

  const firstPage = (await request("GET", "/jobs?limit=2")).json();
  const secondPage = (await request("GET", `/jobs?limit=2&cursor=${firstPage.nextCursor}`)).json();

  expect(firstPage).toEqual({ items: [newest, middle], nextCursor: expect.any(String) });
  expect(secondPage).toEqual({ items: [oldest], nextCursor: null });
});

test("GET /jobs neither skips nor repeats jobs created at the same time", async () => {
  const created = await insertJobs(5, "2026-10-01T12:00:00.123456Z");

  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const page: JobListPage = (
      await request("GET", `/jobs?limit=2${cursor ? `&cursor=${cursor}` : ""}`)
    ).json();
    ids.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
  } while (cursor);

  expect(ids).toHaveLength(created.length);
  expect(new Set(ids)).toEqual(new Set(created.map((job) => job.id)));
});

test.each([
  ["a limit of zero", "limit=0"],
  ["a limit above the maximum", "limit=101"],
  ["a malformed cursor", "cursor=not-a-cursor"],
  [
    "a cursor without an id",
    `cursor=${Buffer.from("2026-10-01T12:00:00.000000Z").toString("base64url")}`,
  ],
])("GET /jobs rejects %s", async (_, query) => {
  const response = await request("GET", `/jobs?${query}`);

  expect(response.statusCode).toBe(400);
});

test("GET /jobs filters the jobs by status", async () => {
  const open = await createJob(emptyInput);
  const applied = await createJob();
  await applyTo(applied.id);

  const openJobs = (await request("GET", "/jobs?status=open")).json();
  const appliedJobs = (await request("GET", "/jobs?status=applied")).json();

  expect(openJobs.items).toEqual([toListItem(open)]);
  expect(appliedJobs.items).toEqual([{ ...toListItem(applied), status: "applied" }]);
});

test.each([
  ["the company", "randstad", ["Lead Developer Frontend"]],
  ["the position", "FRONTEND DEV", ["Frontend Developer"]],
  ["a wildcard as text", "%", []],
])("GET /jobs searches %s", async (_, search, positions) => {
  await createJob(emptyInput);
  await createJob();

  const response = await request("GET", `/jobs?search=${encodeURIComponent(search)}`);

  expect(response.json().items.map((item: { position: string }) => item.position)).toEqual(
    positions,
  );
});

async function insertUnviewedJob() {
  const [row] = await db
    .insert(jobs)
    .values({ ...toSalaryColumns(emptyInput), userId: "user-id" })
    .returning();
  return row!;
}

test("GET /jobs marks the jobs that have not been viewed yet as new", async () => {
  const unviewed = await insertUnviewedJob();
  const created = await createJob();

  const { items } = (await request("GET", "/jobs")).json();

  expect(items).toEqual([
    expect.objectContaining({ id: created.id, isNew: false }),
    expect.objectContaining({ id: unviewed.id, isNew: true }),
  ]);
});

test("POST /jobs/:id/view marks the job as viewed", async () => {
  const job = await insertUnviewedJob();

  const response = await request("POST", `/jobs/${job.id}/view`);

  expect(response.statusCode).toBe(204);
  expect((await request("GET", `/jobs/${job.id}`)).json()).toMatchObject({ isNew: false });
});

test("POST /jobs/:id/view keeps the time of the first view", async () => {
  const job = await insertUnviewedJob();
  await request("POST", `/jobs/${job.id}/view`);
  const [firstView] = await db.select().from(jobs).where(eq(jobs.id, job.id));

  await request("POST", `/jobs/${job.id}/view`);

  const [secondView] = await db.select().from(jobs).where(eq(jobs.id, job.id));
  expect(secondView!.viewedAt).toEqual(firstView!.viewedAt);
});

test("POST /jobs/:id/view marks a job with an application as viewed", async () => {
  const job = await insertUnviewedJob();
  await applyTo(job.id);

  const response = await request("POST", `/jobs/${job.id}/view`);

  expect(response.statusCode).toBe(204);
});

async function markFavorite(id: string, favorite = true, userId?: string) {
  return request("PUT", `/jobs/${id}/favorite`, { body: { favorite }, userId });
}

test("GET /jobs/counts counts the user's jobs by status and favorites", async () => {
  await createJob(emptyInput);
  await markFavorite((await createJob(emptyInput)).id);
  await applyTo((await createJob()).id);
  await markFavorite((await createJob(jobInput, "other-user")).id, true, "other-user");

  const response = await request("GET", "/jobs/counts");

  expect(response.json()).toEqual({
    statuses: [
      { status: "open", count: 2 },
      { status: "applied", count: 1 },
    ],
    favorites: 1,
  });
});

test("GET /jobs/counts leaves out statuses without jobs", async () => {
  await createJob();

  expect((await request("GET", "/jobs/counts")).json()).toEqual({
    statuses: [{ status: "open", count: 1 }],
    favorites: 0,
  });
});

test("PUT /jobs/:id/favorite marks and unmarks the job", async () => {
  const job = await createJob();

  expect((await markFavorite(job.id)).statusCode).toBe(204);
  expect((await request("GET", `/jobs/${job.id}`)).json()).toMatchObject({ favorite: true });

  await markFavorite(job.id, false);
  expect((await request("GET", `/jobs/${job.id}`)).json()).toMatchObject({ favorite: false });
});

test("PUT /jobs/:id/favorite marks a job with an application", async () => {
  const job = await createJob();
  await applyTo(job.id);

  expect((await markFavorite(job.id)).statusCode).toBe(204);
});

test("PUT /jobs/:id/favorite rejects a missing mark", async () => {
  const job = await createJob();

  const response = await request("PUT", `/jobs/${job.id}/favorite`, { body: {} });

  expect(response.statusCode).toBe(400);
});

test("GET /jobs filters the favorite jobs", async () => {
  const favorite = await createJob();
  await createJob(emptyInput);
  await markFavorite(favorite.id);

  const { items } = (await request("GET", "/jobs?favorite=true")).json();

  expect(items).toEqual([expect.objectContaining({ id: favorite.id, favorite: true })]);
});

test("GET /jobs/:id returns the job", async () => {
  const job = await createJob();

  const response = await request("GET", `/jobs/${job.id}`);

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(job);
});

test("PUT /jobs/:id replaces the job", async () => {
  const job = await createJob();
  const lastUpdate = new Date("2026-01-01T00:00:00.000Z");
  await db.update(jobs).set({ updatedAt: lastUpdate }).where(eq(jobs.id, job.id));

  const response = await request("PUT", `/jobs/${job.id}`, { body: emptyInput });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({ ...emptyInput, id: job.id, createdAt: job.createdAt });
  expect(new Date(response.json().updatedAt).getTime()).toBeGreaterThan(lastUpdate.getTime());
});

test("GET /jobs/:id links the application", async () => {
  const job = await createJob();
  const application = await applyTo(job.id);

  const response = await request("GET", `/jobs/${job.id}`);

  expect(response.json()).toMatchObject({
    status: "applied",
    application: { id: application.id, position: "Lead Developer Frontend", status: "applied" },
  });
});

test.each([
  ["PUT", emptyInput],
  ["DELETE", undefined],
] as const)("%s /jobs/:id refuses to change a job with an application", async (method, body) => {
  const job = await createJob();
  await applyTo(job.id);

  const response = await request(method, `/jobs/${job.id}`, { body });

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({ error: "applied" });
  expect((await request("GET", `/jobs/${job.id}`)).json()).toMatchObject(jobInput);
});

test("DELETE /jobs/:id deletes the job", async () => {
  const job = await createJob();

  const response = await request("DELETE", `/jobs/${job.id}`);

  expect(response.statusCode).toBe(204);
  expect((await request("GET", `/jobs/${job.id}`)).statusCode).toBe(404);
});

test.each([
  ["GET", "", undefined],
  ["PUT", "", emptyInput],
  ["DELETE", "", undefined],
  ["POST", "/view", undefined],
  ["PUT", "/favorite", { favorite: true }],
] as const)("%s /jobs/:id%s does not reveal jobs of other users", async (method, path, body) => {
  const job = await createJob(jobInput, "other-user");

  const response = await request(method, `/jobs/${job.id}${path}`, { body });

  expect(response.statusCode).toBe(404);
  expect((await request("GET", `/jobs/${job.id}`, { userId: "other-user" })).json()).toEqual(job);
});

test("GET /jobs/:id responds with 404 for an unknown job", async () => {
  const response = await request("GET", "/jobs/00000000-0000-4000-8000-000000000000");

  expect(response.statusCode).toBe(404);
});

test("GET /jobs/:id rejects an invalid id", async () => {
  const response = await request("GET", "/jobs/not-a-uuid");

  expect(response.statusCode).toBe(400);
});

test("requires authentication", async () => {
  const response = await app.inject({ method: "GET", url: "/jobs" });

  expect(response.statusCode).toBe(401);
});
