import { createRemoteJWKSet } from "jose";
import { buildApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "localhost";
const keycloakIssuer = process.env.KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/apps";
const keycloakClientId = process.env.KEYCLOAK_CLIENT_ID ?? "appligator-app";

const app = buildApp({
  issuer: keycloakIssuer,
  clientId: keycloakClientId,
  keys: createRemoteJWKSet(new URL(`${keycloakIssuer}/protocol/openid-connect/certs`)),
});

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
