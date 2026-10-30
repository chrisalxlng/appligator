import {
  aiErrorSchema,
  aiModelCatalogSchema,
  aiSettingsInputSchema,
  aiSettingsSchema,
  jobExtractionInputSchema,
  jobExtractionSchema,
  jobImportInputSchema,
  jobSchema,
  maxJobPageLength,
  type AiSettingsInput,
} from "@appligator/shared";
import { eq } from "drizzle-orm";
import type { FastifyBaseLogger, FastifyReply } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { aiErrorStatus, toAiErrorCode } from "../ai/aiError.ts";
import type { ApiKeyCipher } from "../ai/apiKeyCipher.ts";
import { extractJob, extractJobFromPage } from "../ai/extractJob.ts";
import { readJobPage } from "../ai/jobPage.ts";
import { verifyLanguageModel, type CreateLanguageModel } from "../ai/languageModel.ts";
import type { ModelCatalog } from "../ai/modelCatalog.ts";
import { aiSettings, jobs } from "../db/schema.ts";
import { toColumns, toJob } from "./jobs.ts";
import { notFoundSchema } from "./notFound.ts";

export interface AiOptions {
  apiKeyCipher: ApiKeyCipher;
  modelCatalog: ModelCatalog;
  createLanguageModel: CreateLanguageModel;
}

type AiSettingsRow = typeof aiSettings.$inferSelect;

const aiErrorResponses = { 409: aiErrorSchema, 422: aiErrorSchema, 502: aiErrorSchema };
const maxJobPageBytes = maxJobPageLength * 2;

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

function abortSignalOnClose(reply: FastifyReply) {
  const abortController = new AbortController();
  reply.raw.once("close", () => {
    if (!reply.raw.writableFinished) abortController.abort();
  });
  return abortController.signal;
}

export const aiRoutes: FastifyPluginAsyncZod<AiOptions> = async (
  app,
  { apiKeyCipher, modelCatalog, createLanguageModel },
) => {
  // A key stored with another encryption secret can't be decrypted and counts as missing.
  function readApiKey({ encryptedApiKey, userId }: AiSettingsRow, log: FastifyBaseLogger) {
    try {
      return apiKeyCipher.decrypt(encryptedApiKey, userId);
    } catch (error) {
      log.error(error, "Decrypting the stored API key failed");
      return undefined;
    }
  }

  async function loadLanguageModel(userId: string, log: FastifyBaseLogger) {
    const [settings] = await app.db.select().from(aiSettings).where(eq(aiSettings.userId, userId));
    if (!settings) return undefined;

    const apiKey = readApiKey(settings, log);
    if (!apiKey) return undefined;

    const { provider, model, language } = settings;
    return { model: createLanguageModel({ provider, model, apiKey }), language };
  }

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
        response: { 200: aiSettingsSchema, ...aiErrorResponses },
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
        input.apiKey ?? (keepsProvider ? readApiKey(existing, request.log) : undefined);
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

  app.post(
    "/ai/job-extraction",
    {
      schema: {
        body: jobExtractionInputSchema,
        response: { 200: jobExtractionSchema, ...aiErrorResponses },
      },
    },
    async (request, reply) => {
      const languageModel = await loadLanguageModel(request.userId, request.log);
      if (!languageModel) return reply.code(409).send({ error: "notConfigured" });

      try {
        return await extractJob({
          ...languageModel,
          description: request.body.description,
          today: new Date(),
          abortSignal: abortSignalOnClose(reply),
        });
      } catch (error) {
        const code = toAiErrorCode(error);
        request.log.info({ code }, "Job extraction failed");
        return reply.code(aiErrorStatus(code)).send({ error: code });
      }
    },
  );

  app.post(
    "/ai/job-import",
    {
      bodyLimit: maxJobPageBytes,
      schema: {
        body: jobImportInputSchema,
        response: { 201: jobSchema, ...aiErrorResponses },
      },
    },
    async (request, reply) => {
      const languageModel = await loadLanguageModel(request.userId, request.log);
      if (!languageModel) return reply.code(409).send({ error: "notConfigured" });

      const { link, html } = request.body;
      let result;
      try {
        result = await extractJobFromPage({
          ...languageModel,
          page: readJobPage(html, link),
          today: new Date(),
          abortSignal: abortSignalOnClose(reply),
        });
      } catch (error) {
        const code = toAiErrorCode(error);
        request.log.info({ code }, "Job import failed");
        return reply.code(aiErrorStatus(code)).send({ error: code });
      }

      const { extraction, description } = result;
      const { company, position, ...details } = extraction;
      if (!company || !position) return reply.code(422).send({ error: "noJobFound" });

      const [row] = await app.db
        .insert(jobs)
        .values({
          ...toColumns({
            ...details,
            link,
            description,
            company,
            position,
            commuteDistance: null,
            commuteDuration: null,
          }),
          userId: request.userId,
        })
        .returning();
      return reply.code(201).send(toJob(row!));
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
