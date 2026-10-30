import { expect, test } from "vite-plus/test";
import { buildTestApp, signToken, testWebAppOrigin } from "./testAuth.ts";

test("allows preflight requests from the web app without authentication", async () => {
  const app = buildTestApp();

  const response = await app.inject({
    method: "OPTIONS",
    url: "/jobs/1",
    headers: {
      origin: testWebAppOrigin,
      "access-control-request-method": "PUT",
      "access-control-request-headers": "authorization, content-type",
    },
  });

  expect(response.statusCode).toBe(204);
  expect(response.headers["access-control-allow-origin"]).toBe(testWebAppOrigin);
  expect(response.headers["access-control-allow-methods"]).toContain("PUT");
});

test("allows the web app to read responses", async () => {
  const app = buildTestApp();

  const response = await app.inject({
    method: "GET",
    url: "/jobs",
    headers: { origin: testWebAppOrigin, authorization: `Bearer ${await signToken()}` },
  });

  expect(response.statusCode).toBe(200);
  expect(response.headers["access-control-allow-origin"]).toBe(testWebAppOrigin);
});

test("does not allow other origins", async () => {
  const app = buildTestApp();

  const response = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "https://evil.test" },
  });

  expect(response.headers["access-control-allow-origin"]).not.toBe("https://evil.test");
});
