import { generateKeyPair } from "jose";
import { beforeEach, expect, test } from "vite-plus/test";
import { buildTestApp, signToken } from "./testAuth.ts";

let app: ReturnType<typeof buildTestApp>;

beforeEach(() => {
  app = buildTestApp();
  app.get("/protected", async () => ({ ok: true }));
});

function requestWithToken(token: string) {
  return app.inject({
    method: "GET",
    url: "/protected",
    headers: { authorization: `Bearer ${token}` },
  });
}

test("accepts a valid token", async () => {
  const response = await requestWithToken(await signToken());

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ ok: true });
});

test("rejects a request without a token", async () => {
  const response = await app.inject({ method: "GET", url: "/protected" });

  expect(response.statusCode).toBe(401);
  expect(response.json()).toEqual({ error: "Unauthorized" });
});

test("rejects a malformed authorization header", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/protected",
    headers: { authorization: `Basic ${await signToken()}` },
  });

  expect(response.statusCode).toBe(401);
});

test("rejects an expired token", async () => {
  const response = await requestWithToken(await signToken({}, { expiresIn: "-1m" }));

  expect(response.statusCode).toBe(401);
});

test("rejects a token signed with an unknown key", async () => {
  const { privateKey } = await generateKeyPair("RS256");

  const response = await requestWithToken(await signToken({}, { signingKey: privateKey }));

  expect(response.statusCode).toBe(401);
});

test("rejects a token from another issuer", async () => {
  const response = await requestWithToken(
    await signToken({ iss: "http://keycloak.test/realms/other" }),
  );

  expect(response.statusCode).toBe(401);
});

test("rejects a token issued for another client", async () => {
  const response = await requestWithToken(await signToken({ azp: "paytrace-app" }));

  expect(response.statusCode).toBe(401);
});

test("rejects unknown routes without revealing them", async () => {
  const response = await app.inject({ method: "GET", url: "/does-not-exist" });

  expect(response.statusCode).toBe(401);
});
