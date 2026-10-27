import { expect, test } from "vite-plus/test";
import { buildApp } from "../app.ts";

test("GET /health reports ok", async () => {
  const app = buildApp();

  const response = await app.inject({ method: "GET", url: "/health" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: "ok" });
});
