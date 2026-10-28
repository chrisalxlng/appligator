import {
  aiErrorSchema,
  aiModelCatalogSchema,
  aiSettingsInputSchema,
  aiSettingsSchema,
  type AiSettingsInput,
} from "@appligator/shared";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { aiErrorStatus, toAiErrorCode } from "../ai/aiError.ts";
import type { ApiKeyCipher } from "../ai/apiKeyCipher.ts";
import { verifyLanguageModel, type CreateLanguageModel } from "../ai/languageModel.ts";
import type { ModelCatalog } from "../ai/modelCatalog.ts";
import { aiSettings } from "../db/schema.ts";

export interface AiOptions {
  apiKeyCipher: ApiKeyCipher;
  modelCatalog: ModelCatalog;
  createLanguageModel: CreateLanguageModel;
}

type AiSettingsRow = typeof aiSettings.$inferSelect;

const notFoundSchema = z.object({ error: z.literal("Not Found") });

function toAiSettings({ provider, model, language, accessUpdatedAt }: AiSettingsRow) {
  return { provider, model, language, accessUpdatedAt: accessUpdatedAt.toISOString() };
}

function changesAccess(existing: AiSettingsRow | undefined, input: AiSettingsInput) {
  return (
    !existing ||
    input.apiKey !== undefined ||
    input.provider !== existing.provider ||
    input.model !== existing.model
  );
}

export const aiRoutes: FastifyPluginAsyncZod<AiOptions> = async (
  app,
  { apiKeyCipher, modelCatalog, createLanguageModel },
) => {
  app.get(
    "/ai/models",
    { schema: { response: { 200: aiModelCatalogSchema, 503: aiErrorSchema } } },
    async (request, reply) => {
      try {
        return await modelCatalog.get();
      } catch (error) {
        request.log.error(error, "Loading the model catalog failed");
        return reply.code(503).send({ error: "providerUnavailable" });
      }
    },
  );

  app.get(
    "/ai/settings",
    { schema: { response: { 200: aiSettingsSchema.nullable() } } },
    async (request) => {
      const [row] = await app.db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.userId, request.userId));
      return row ? toAiSettings(row) : null;
    },
  );

  app.put(
    "/ai/settings",
    {
      schema: {
        body: aiSettingsInputSchema,
        response: { 200: aiSettingsSchema, 422: aiErrorSchema, 502: aiErrorSchema },
      },
    },
    async (request, reply) => {
      const { userId, body: input } = request;
      const [existing] = await app.db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.userId, userId));

      if (existing && !changesAccess(existing, input)) {
        const [row] = await app.db
          .update(aiSettings)
          .set({ language: input.language })
          .where(eq(aiSettings.userId, userId))
          .returning();
        return toAiSettings(row!);
      }

      const keepsProvider = existing?.provider === input.provider;
      const apiKey =
        input.apiKey ??
        (keepsProvider ? apiKeyCipher.decrypt(existing.encryptedApiKey, userId) : undefined);
      if (!apiKey) return reply.code(422).send({ error: "apiKeyRequired" });

      try {
        const { provider, model } = input;
        await verifyLanguageModel(createLanguageModel({ provider, model, apiKey }));
      } catch (error) {
        const code = toAiErrorCode(error);
        request.log.info({ code }, "AI access verification failed");
        return reply.code(aiErrorStatus(code)).send({ error: code });
      }

      const access = {
        provider: input.provider,
        model: input.model,
        encryptedApiKey: apiKeyCipher.encrypt(apiKey, userId),
        language: input.language,
        accessUpdatedAt: new Date(),
      };
      const [row] = await app.db
        .insert(aiSettings)
        .values({ ...access, userId })
        .onConflictDoUpdate({ target: aiSettings.userId, set: access })
        .returning();
      return toAiSettings(row!);
    },
  );

  app.delete(
    "/ai/settings",
    { schema: { response: { 204: z.null(), 404: notFoundSchema } } },
    async (request, reply) => {
      const [row] = await app.db
        .delete(aiSettings)
        .where(eq(aiSettings.userId, request.userId))
        .returning({ userId: aiSettings.userId });

      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );
};
