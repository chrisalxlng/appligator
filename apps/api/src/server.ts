import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createRemoteJWKSet } from "jose";
import { Pool } from "pg";
import { createLanguageModel } from "./ai/languageModel.ts";
import { createModelCatalog } from "./ai/modelCatalog.ts";
import { buildApp } from "./app.ts";
import { createSecretCipher } from "./crypto/secretCipher.ts";
import * as schema from "./db/schema.ts";
import { requireEnv } from "./env.ts";
import { createMailAccessVerifier } from "./mail/mailAccess.ts";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "localhost";
const keycloakIssuer = requireEnv("KEYCLOAK_ISSUER");
const keycloakClientId = requireEnv("KEYCLOAK_CLIENT_ID");
const webAppOrigin = requireEnv("WEB_APP_ORIGIN");
const apiKeyCipher = createSecretCipher(
  requireEnv("AI_API_KEY_ENCRYPTION_KEY"),
  "appligator-api-key-encryption",
);
const mailPasswordCipher = createSecretCipher(
  requireEnv("MAIL_CREDENTIAL_ENCRYPTION_KEY"),
  "appligator-mail-password-encryption",
);
const pool = new Pool({
  connectionString: requireEnv("DATABASE_URL"),
  connectionTimeoutMillis: 5_000,
});

const db = drizzle({ client: pool, schema, casing: "snake_case" });

const app = buildApp({
  auth: {
    issuer: keycloakIssuer,
    clientId: keycloakClientId,
    keys: createRemoteJWKSet(new URL(`${keycloakIssuer}/protocol/openid-connect/certs`)),
  },
  db,
  ai: { apiKeyCipher, modelCatalog: createModelCatalog(), createLanguageModel },
  mail: {
    passwordCipher: mailPasswordCipher,
    verifyMailAccess: createMailAccessVerifier({
      localDevPort: Number(process.env.MAIL_LOCAL_DEV_PORT) || undefined,
    }),
  },
  webAppOrigin,
  apiDocs: process.env.API_DOCS === "true",
});

pool.on("error", (error) => app.log.error(error, "Idle database client failed"));
app.addHook("onClose", () => pool.end());

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => app.close());
}

try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
