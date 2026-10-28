import { drizzle } from "drizzle-orm/node-postgres";
import { createRemoteJWKSet } from "jose";
import { Pool } from "pg";
import { buildApp } from "./app.ts";
import * as schema from "./db/schema.ts";
import { requireEnv } from "./env.ts";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "localhost";
const keycloakIssuer = requireEnv("KEYCLOAK_ISSUER");
const keycloakClientId = requireEnv("KEYCLOAK_CLIENT_ID");
const pool = new Pool({
  connectionString: requireEnv("DATABASE_URL"),
  connectionTimeoutMillis: 5_000,
});

const app = buildApp({
  auth: {
    issuer: keycloakIssuer,
    clientId: keycloakClientId,
    keys: createRemoteJWKSet(new URL(`${keycloakIssuer}/protocol/openid-connect/certs`)),
  },
  db: drizzle({ client: pool, schema }),
});

pool.on("error", (error) => app.log.error(error, "Idle database client failed"));
app.addHook("onClose", () => pool.end());

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => app.close());
}

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
