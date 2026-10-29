import { expect, test } from "vite-plus/test";
import { buildTestApp } from "./testAuth.ts";

test("serves the OpenAPI document of all routes without authentication", async () => {
  const app = buildTestApp({ apiDocs: true });

  const response = await app.inject({ method: "GET", url: "/docs/json" });
  const document = response.json();

  expect(response.statusCode).toBe(200);
  expect(Object.keys(document.paths)).toEqual(
    expect.arrayContaining(["/health", "/jobs", "/jobs/{id}", "/ai/settings"]),
  );
  expect(document.paths["/jobs/{id}"].get.parameters).toEqual([
    expect.objectContaining({ in: "path", name: "id", required: true }),
  ]);
});

test("groups the routes by their first path segment", async () => {
  const app = buildTestApp({ apiDocs: true });

  const document = (await app.inject({ method: "GET", url: "/docs/json" })).json();

  expect(document.paths["/health"].get.tags).toEqual(["health"]);
  expect(document.paths["/jobs/{id}"].put.tags).toEqual(["jobs"]);
  expect(document.paths["/ai/settings"].get.tags).toEqual(["ai"]);
});

test("requires a login only for protected routes", async () => {
  const app = buildTestApp({ apiDocs: true });

  const document = (await app.inject({ method: "GET", url: "/docs/json" })).json();

  expect(document.security).toEqual([{ keycloak: ["openid"] }]);
  expect(document.paths["/health"].get.security).toEqual([]);
  expect(document.paths["/jobs"].get.security).toBeUndefined();
});

test("serves the Swagger UI without authentication", async () => {
  const app = buildTestApp({ apiDocs: true });

  const response = await app.inject({ method: "GET", url: "/docs/" });

  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toContain("text/html");
});

test("serves no docs unless enabled", async () => {
  const app = buildTestApp();

  const response = await app.inject({ method: "GET", url: "/docs/json" });

  expect(response.statusCode).not.toBe(200);
});
