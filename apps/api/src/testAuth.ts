import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { buildApp } from "./app.ts";

const issuer = "http://keycloak.test/realms/apps";
const clientId = "appligator-app";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: "RS256" }] });

export function buildTestApp() {
  return buildApp({ issuer, clientId, keys });
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
