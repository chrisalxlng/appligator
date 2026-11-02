import { randomBytes } from "node:crypto";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { buildApp } from "./app.ts";
import { createSecretCipher } from "./crypto/secretCipher.ts";
import type { Database } from "./db/database.ts";
import type { AiOptions } from "./routes/ai.ts";
import type { MailOptions } from "./routes/mail.ts";
import { createTestDatabase } from "./testDatabase.ts";
import { respondingModel } from "./testLanguageModel.ts";

const issuer = "http://keycloak.test/realms/apps";
const clientId = "appligator-app";
export const testWebAppOrigin = "http://app.test";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: "RS256" }] });
const testDatabase = await createTestDatabase();

export const testApiKeyCipher = createSecretCipher(
  randomBytes(32).toString("base64"),
  "test-api-keys",
);
export const testMailPasswordCipher = createSecretCipher(
  randomBytes(32).toString("base64"),
  "test-mail-passwords",
);

const testAi: AiOptions = {
  apiKeyCipher: testApiKeyCipher,
  modelCatalog: { get: async () => ({ openai: [], anthropic: [], google: [], mistral: [] }) },
  createLanguageModel: () => respondingModel(),
};

const testMail: MailOptions = {
  passwordCipher: testMailPasswordCipher,
  verifyMailAccess: async () => undefined,
  readNewMail: async (_access, cursors) => ({ cursors, hasMore: false }),
};

export function buildTestApp({
  db = testDatabase,
  ai = {},
  mail = {},
  apiDocs = false,
}: {
  db?: Database;
  ai?: Partial<AiOptions>;
  mail?: Partial<MailOptions>;
  apiDocs?: boolean;
} = {}) {
  return buildApp({
    auth: { issuer, clientId, keys },
    db,
    ai: { ...testAi, ...ai },
    mail: { ...testMail, ...mail },
    webAppOrigin: testWebAppOrigin,
    apiDocs,
  });
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
