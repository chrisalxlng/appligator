import type { JobInput } from "@appligator/shared";
import { eq } from "drizzle-orm";
import { beforeEach, expect, test } from "vite-plus/test";
import { jobs } from "../db/schema.ts";
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
  salary: { currency: "EUR", period: "year", min: 65_000, max: 75_000 },
  locations: ["Düsseldorf", "Hamburg"],
  workModel: "hybrid",
  employmentType: "fullTime",
  applicationDeadline: "2026-12-31",
};

const emptyInput: JobInput = {
  link: null,
  description: "",
  summary: "",
  company: "Initech GmbH",
  position: "Frontend Developer",
  salary: null,
  locations: [],
  workModel: null,
  employmentType: null,
  applicationDeadline: null,
};

beforeEach(async () => {
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

test("POST /jobs creates a job", async () => {
  const response = await request("POST", "/jobs", { body: jobInput });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toEqual({
    ...jobInput,
    id: expect.any(String),
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
  ["an invalid deadline", { applicationDeadline: "31.12.2026" }],
])("POST /jobs rejects %s", async (_, override) => {
  const response = await request("POST", "/jobs", { body: { ...jobInput, ...override } });

  expect(response.statusCode).toBe(400);
});

test("GET /jobs lists only the user's jobs, newest first", async () => {
  const older = await createJob(emptyInput);
  const newer = await createJob();
  await createJob(jobInput, "other-user");

  const response = await request("GET", "/jobs");

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(
    [newer, older].map(({ id, company, position, createdAt }) => ({
      id,
      company,
      position,
      createdAt,
    })),
  );
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

test("DELETE /jobs/:id deletes the job", async () => {
  const job = await createJob();

  const response = await request("DELETE", `/jobs/${job.id}`);

  expect(response.statusCode).toBe(204);
  expect((await request("GET", `/jobs/${job.id}`)).statusCode).toBe(404);
});

test.each([
  ["GET", undefined],
  ["PUT", emptyInput],
  ["DELETE", undefined],
] as const)("%s /jobs/:id does not reveal jobs of other users", async (method, body) => {
  const job = await createJob(jobInput, "other-user");

  const response = await request(method, `/jobs/${job.id}`, { body });

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
