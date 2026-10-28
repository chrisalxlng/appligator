import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { buildApp } from "./app.ts";
import type { Database } from "./db/database.ts";
import { createTestDatabase } from "./testDatabase.ts";

const issuer = "http://keycloak.test/realms/apps";
const clientId = "appligator-app";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: "RS256" }] });
const testDatabase = createTestDatabase();

export function buildTestApp({ db = testDatabase }: { db?: Database } = {}) {
  return buildApp({ auth: { issuer, clientId, keys }, db });
}

export function signToken(
  payload: JWTPayload = {},
  { signingKey = privateKey, expiresIn = "5m" } = {},
) {
  return new SignJWT({ iss: issuer, azp: clientId, sub: "user-id", ...payload })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(signingKey);
}
