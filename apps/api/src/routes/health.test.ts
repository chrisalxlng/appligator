import { expect, test } from "vite-plus/test";
import { createTestDatabase } from "../testDatabase.ts";
import { buildTestApp } from "../testAuth.ts";

test("GET /health reports ok without authentication", async () => {
  const app = buildTestApp();

  const response = await app.inject({ method: "GET", url: "/health" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: "ok" });
});

test("GET /health reports unavailable when the database is unreachable", async () => {
  const db = await createTestDatabase();
  await db.$client.close();
  const app = buildTestApp({ db });

  const response = await app.inject({ method: "GET", url: "/health" });

  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ status: "unavailable" });
});
