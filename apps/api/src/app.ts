import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { serveApiDocs } from "./apiDocs.ts";
import { createLanguageModelLoader } from "./ai/storedLanguageModel.ts";
import { requireAuthentication, type AuthOptions } from "./auth.ts";
import type { Database } from "./db/database.ts";
import { createMailSync, type MailSync } from "./mail/mailSync.ts";
import { activityRoutes } from "./routes/activities.ts";
import { aiRoutes, type AiOptions } from "./routes/ai.ts";
import { applicationRoutes } from "./routes/applications.ts";
import { healthRoutes } from "./routes/health.ts";
import { jobRoutes } from "./routes/jobs.ts";
import { mailRoutes, type MailOptions } from "./routes/mail.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    mailSync: MailSync;
  }
}

export interface AppOptions {
  auth: AuthOptions;
  db: Database;
  ai: AiOptions;
  mail: MailOptions;
  webAppOrigin: string;
  apiDocs?: boolean;
}

export function buildApp({ auth, db, ai, mail, webAppOrigin, apiDocs = false }: AppOptions) {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate("db", db);
  app.decorate(
    "mailSync",
    createMailSync({
      ...mail,
      db,
      loadLanguageModel: createLanguageModelLoader({ ...ai, db }),
      log: app.log,
    }),
  );

  app.register(fastifyCors, { origin: webAppOrigin, methods: ["GET", "POST", "PUT", "DELETE"] });
  requireAuthentication(app, auth);
  app.register(fastifyRateLimit, {
    global: false,
    keyGenerator: (request) => request.userId || request.ip,
  });
  if (apiDocs) serveApiDocs(app, auth);

  app.register(healthRoutes);
  app.register(jobRoutes);
  app.register(applicationRoutes);
  app.register(activityRoutes);
  app.register(aiRoutes, ai);
  app.register(mailRoutes, mail);

  return app;
}
