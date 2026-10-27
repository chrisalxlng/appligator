import { expect, test } from "vite-plus/test";
import { buildTestApp } from "../testAuth.ts";

test("GET /health reports ok without authentication", async () => {
  const app = buildTestApp();

  const response = await app.inject({ method: "GET", url: "/health" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: "ok" });
});
