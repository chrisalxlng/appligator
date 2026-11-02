import { eq } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import type { SecretCipher } from "../crypto/secretCipher.ts";
import type { Database } from "../db/database.ts";
import { aiSettings } from "../db/schema.ts";
import type { CreateLanguageModel } from "./languageModel.ts";

interface StoredLanguageModelOptions {
  db: Database;
  apiKeyCipher: SecretCipher;
  createLanguageModel: CreateLanguageModel;
}

// A key stored with another encryption secret can't be decrypted and counts as missing.
export function readStoredApiKey(
  apiKeyCipher: SecretCipher,
  { encryptedApiKey, userId }: typeof aiSettings.$inferSelect,
  log: FastifyBaseLogger,
) {
  try {
    return apiKeyCipher.decrypt(encryptedApiKey, userId);
  } catch (error) {
    log.error(error, "Decrypting the stored API key failed");
    return undefined;
  }
}

export type LoadLanguageModel = ReturnType<typeof createLanguageModelLoader>;

export function createLanguageModelLoader({
  db,
  apiKeyCipher,
  createLanguageModel,
}: StoredLanguageModelOptions) {
  return async (userId: string, log: FastifyBaseLogger) => {
    const [settings] = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId));
    if (!settings) return undefined;

    const apiKey = readStoredApiKey(apiKeyCipher, settings, log);
    if (!apiKey) return undefined;

    const { provider, model, language } = settings;
    return { model: createLanguageModel({ provider, model, apiKey }), language };
  };
}
