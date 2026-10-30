import type { AiSettingsInput } from "@appligator/shared";
import { eq } from "drizzle-orm";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import type { CreateLanguageModel } from "../ai/languageModel.ts";
import { aiSettings, jobs } from "../db/schema.ts";
import { createTestDatabase } from "../testDatabase.ts";
import { buildTestApp, signToken, testApiKeyCipher } from "../testAuth.ts";
import { failingModel, respondingModel } from "../testLanguageModel.ts";

const db = await createTestDatabase();
const createLanguageModel = vi.fn<CreateLanguageModel>();
const getCatalog = vi.fn();
const app = buildTestApp({ db, ai: { createLanguageModel, modelCatalog: { get: getCatalog } } });

const settingsInput: AiSettingsInput = {
  provider: "openai",
  model: "gpt-6-astra",
  apiKey: "sk-secret",
  language: "de",
};

beforeEach(async () => {
  await db.delete(aiSettings);
  await db.delete(jobs);
  createLanguageModel.mockReset().mockImplementation(() => respondingModel());
  getCatalog.mockReset();
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

async function saveSettings(input: AiSettingsInput = settingsInput, userId?: string) {
  const response = await request("PUT", "/ai/settings", { body: input, userId });
  expect(response.statusCode).toBe(200);
  createLanguageModel.mockClear();
  return response.json();
}

async function storedRow(userId = "user-id") {
  const [row] = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId));
  return row;
}

test("GET /ai/models returns the model catalog", async () => {
  const catalog = { openai: ["gpt-6-astra"], anthropic: [], google: [], mistral: [] };
  getCatalog.mockResolvedValue(catalog);

  const response = await request("GET", "/ai/models");

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(catalog);
});

test("GET /ai/models responds with 503 when the catalog is unavailable", async () => {
  getCatalog.mockRejectedValue(new Error("offline"));

  const response = await request("GET", "/ai/models");

  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ error: "providerUnavailable" });
});

test("GET /ai/settings returns null without settings", async () => {
  const response = await request("GET", "/ai/settings");

  expect(response.statusCode).toBe(200);
  expect(response.json()).toBeNull();
});

test("PUT /ai/settings verifies and stores the access without returning the API key", async () => {
  const response = await request("PUT", "/ai/settings", { body: settingsInput });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    provider: "openai",
    model: "gpt-6-astra",
    language: "de",
    accessUpdatedAt: expect.any(String),
  });
  expect(createLanguageModel).toHaveBeenCalledWith({
    provider: "openai",
    model: "gpt-6-astra",
    apiKey: "sk-secret",
  });
  expect((await request("GET", "/ai/settings")).json()).toEqual(response.json());
});

test("PUT /ai/settings stores the API key encrypted", async () => {
  await saveSettings();

  const row = await storedRow();
  expect(row!.encryptedApiKey).not.toContain("sk-secret");
  expect(testApiKeyCipher.decrypt(row!.encryptedApiKey, "user-id")).toBe("sk-secret");
});

test("PUT /ai/settings requires an API key for new settings", async () => {
  const { apiKey: _apiKey, ...withoutApiKey } = settingsInput;

  const response = await request("PUT", "/ai/settings", { body: withoutApiKey });

  expect(response.statusCode).toBe(422);
  expect(response.json()).toEqual({ error: "apiKeyRequired" });
  expect(await storedRow()).toBeUndefined();
});

test("PUT /ai/settings keeps the stored API key when changing the model", async () => {
  const { accessUpdatedAt } = await saveSettings();

  const response = await request("PUT", "/ai/settings", {
    body: { provider: "openai", model: "gpt-6-sol", language: "de" },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({ model: "gpt-6-sol" });
  expect(response.json().accessUpdatedAt).not.toBe(accessUpdatedAt);
  expect(createLanguageModel).toHaveBeenCalledWith({
    provider: "openai",
    model: "gpt-6-sol",
    apiKey: "sk-secret",
  });
});

test("PUT /ai/settings requires a new API key when changing the provider", async () => {
  await saveSettings();

  const response = await request("PUT", "/ai/settings", {
    body: { provider: "anthropic", model: "claude-sonnet-5-5", language: "de" },
  });

  expect(response.statusCode).toBe(422);
  expect(response.json()).toEqual({ error: "apiKeyRequired" });
  expect(await storedRow()).toMatchObject({ provider: "openai" });
});

async function storeUndecryptableApiKey() {
  await db.update(aiSettings).set({ encryptedApiKey: "v1.unreadable.key.value" });
}

test("PUT /ai/settings requires a new API key when the stored one cannot be decrypted", async () => {
  await saveSettings();
  await storeUndecryptableApiKey();

  const response = await request("PUT", "/ai/settings", {
    body: { provider: "openai", model: "gpt-6-sol", language: "de" },
  });

  expect(response.statusCode).toBe(422);
  expect(response.json()).toEqual({ error: "apiKeyRequired" });
});

test("PUT /ai/settings changes only the language without verifying the access again", async () => {
  const { accessUpdatedAt } = await saveSettings();
  const { apiKey: _apiKey, ...withoutApiKey } = settingsInput;

  const response = await request("PUT", "/ai/settings", {
    body: { ...withoutApiKey, language: "en" },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ ...withoutApiKey, language: "en", accessUpdatedAt });
  expect(createLanguageModel).not.toHaveBeenCalled();
});

test.each([
  [401, 422, "accessRejected"],
  [400, 422, "accessRejected"],
  [404, 422, "accessRejected"],
  [429, 422, "rateLimited"],
  [500, 502, "providerUnavailable"],
])(
  "PUT /ai/settings rejects an access the provider answers with %i",
  async (providerStatus, status, error) => {
    createLanguageModel.mockImplementation(() => failingModel(providerStatus));

    const response = await request("PUT", "/ai/settings", { body: settingsInput });

    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual({ error });
    expect(await storedRow()).toBeUndefined();
  },
);

test("PUT /ai/settings keeps the previous access when the new one is rejected", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() => failingModel(401));

  await request("PUT", "/ai/settings", { body: { ...settingsInput, apiKey: "sk-invalid" } });

  const row = await storedRow();
  expect(testApiKeyCipher.decrypt(row!.encryptedApiKey, "user-id")).toBe("sk-secret");
});

test.each([
  ["an unknown provider", { provider: "unknown" }],
  ["a blank model", { model: " " }],
  ["a blank API key", { apiKey: " " }],
  ["an unsupported language", { language: "fr" }],
])("PUT /ai/settings rejects %s", async (_case, override) => {
  const response = await request("PUT", "/ai/settings", {
    body: { ...settingsInput, ...override },
  });

  expect(response.statusCode).toBe(400);
});

const extractionOutput = {
  company: "Initech GmbH",
  position: "Frontend Developer",
  companyType: "startup",
  employeeCount: 40,
  summary: "Initech sucht eine Frontend-Entwicklerin.",
  salary: null,
  bonuses: [],
  benefits: ["Jobrad"],
  employmentType: "fullTime",
  workModel: "remote",
  homeOfficePercentage: null,
  workingHours: null,
  locations: ["München"],
  vacationDays: 30,
  startDate: null,
  contractTerm: { kind: "permanent", months: null, date: null },
  probationMonths: null,
  noticePeriod: null,
  notes: [],
  applicationDeadline: null,
};

async function extractJob(description = "<p>Frontend Developer at Initech in Munich</p>") {
  return request("POST", "/ai/job-extraction", { body: { description } });
}

test("POST /ai/job-extraction extracts the job with the stored access", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() => respondingModel(JSON.stringify(extractionOutput)));

  const response = await extractJob();

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    ...extractionOutput,
    summary: "<p>Initech sucht eine Frontend-Entwicklerin.</p>",
    contractTerm: { kind: "permanent" },
    notes: "",
  });
  expect(createLanguageModel).toHaveBeenCalledWith({
    provider: "openai",
    model: "gpt-6-astra",
    apiKey: "sk-secret",
  });
});

test("POST /ai/job-extraction responds with 409 without an AI access", async () => {
  const response = await extractJob();

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({ error: "notConfigured" });
  expect(createLanguageModel).not.toHaveBeenCalled();
});

test("POST /ai/job-extraction responds with 409 when the stored API key cannot be decrypted", async () => {
  await saveSettings();
  await storeUndecryptableApiKey();

  const response = await extractJob();

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({ error: "notConfigured" });
  expect(createLanguageModel).not.toHaveBeenCalled();
});

test("POST /ai/job-extraction rejects an empty description", async () => {
  await saveSettings();

  const response = await extractJob("  ");

  expect(response.statusCode).toBe(400);
});

test("POST /ai/job-extraction reports a rejected access", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() => failingModel(401));

  const response = await extractJob();

  expect(response.statusCode).toBe(422);
  expect(response.json()).toEqual({ error: "accessRejected" });
});

test("POST /ai/job-extraction reports an invalid model output", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() => respondingModel("not json"));

  const response = await extractJob();

  expect(response.statusCode).toBe(502);
  expect(response.json()).toEqual({ error: "extractionFailed" });
});

const jobLink = "https://www.stepstone.de/stellenangebote--frontend-developer";
const jobPage =
  "<html><head><title>Frontend Developer | StepStone</title></head>" +
  "<body><nav>Jobs</nav><h1>Frontend Developer</h1><p>Initech sucht dich.</p></body></html>";

async function importJob(body: object = { link: jobLink, html: jobPage }) {
  return request("POST", "/ai/job-import", { body });
}

test("POST /ai/job-import creates the job from the page", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() =>
    respondingModel(
      JSON.stringify({ ...extractionOutput, jobAd: { firstBlock: 0, lastBlock: 1 } }),
    ),
  );

  const response = await importJob();

  expect(response.statusCode).toBe(201);
  const job = response.json();
  expect(job).toMatchObject({
    link: jobLink,
    description: "<h2>Frontend Developer</h2><p>Initech sucht dich.</p>",
    summary: "<p>Initech sucht eine Frontend-Entwicklerin.</p>",
    company: "Initech GmbH",
    position: "Frontend Developer",
    benefits: ["Jobrad"],
    locations: ["München"],
    workModel: "remote",
    contractTerm: { kind: "permanent" },
    commuteDistance: null,
  });
  const [row] = await db.select().from(jobs).where(eq(jobs.id, job.id));
  expect(row).toMatchObject({ userId: "user-id", company: "Initech GmbH" });
});

test("POST /ai/job-import uses the page title without a job title", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() =>
    respondingModel(JSON.stringify({ ...extractionOutput, position: null, jobAd: null })),
  );

  const response = await importJob();

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({ position: "Frontend Developer", description: "" });
});

test("POST /ai/job-import responds with 422 when the page shows no job ad", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() =>
    respondingModel(JSON.stringify({ ...extractionOutput, company: null, jobAd: null })),
  );

  const response = await importJob();

  expect(response.statusCode).toBe(422);
  expect(response.json()).toEqual({ error: "noJobFound" });
  expect(await db.select().from(jobs)).toEqual([]);
});

test("POST /ai/job-import responds with 409 without an AI access", async () => {
  const response = await importJob();

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({ error: "notConfigured" });
});

test.each([
  ["an invalid link", { link: "chrome://extensions", html: jobPage }],
  ["an empty page", { link: jobLink, html: " " }],
])("POST /ai/job-import rejects %s", async (_case, body) => {
  await saveSettings();

  const response = await importJob(body);

  expect(response.statusCode).toBe(400);
});

test("POST /ai/job-import accepts large pages", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() =>
    respondingModel(JSON.stringify({ ...extractionOutput, jobAd: null })),
  );
  const largePage = jobPage.replace("<nav>", `<nav>${"x".repeat(5_000_000)}`);

  const response = await importJob({ link: jobLink, html: largePage });

  expect(response.statusCode).toBe(201);
});

test("POST /ai/job-import reports a rejected access", async () => {
  await saveSettings();
  createLanguageModel.mockImplementation(() => failingModel(401));

  const response = await importJob();

  expect(response.statusCode).toBe(422);
  expect(response.json()).toEqual({ error: "accessRejected" });
});

test("DELETE /ai/settings removes the settings", async () => {
  await saveSettings();

  const response = await request("DELETE", "/ai/settings");

  expect(response.statusCode).toBe(204);
  expect(await storedRow()).toBeUndefined();
});

test("DELETE /ai/settings responds with 404 without settings", async () => {
  const response = await request("DELETE", "/ai/settings");

  expect(response.statusCode).toBe(404);
});

test("settings are only visible to their user", async () => {
  await saveSettings(settingsInput, "other-user-id");

  expect((await request("GET", "/ai/settings")).json()).toBeNull();
  expect((await request("DELETE", "/ai/settings")).statusCode).toBe(404);
});

test("AI routes require authentication", async () => {
  const response = await app.inject({ method: "GET", url: "/ai/settings" });

  expect(response.statusCode).toBe(401);
});
