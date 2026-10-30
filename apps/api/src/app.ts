import fastifyCors from "@fastify/cors";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { serveApiDocs } from "./apiDocs.ts";
import { requireAuthentication, type AuthOptions } from "./auth.ts";
import type { Database } from "./db/database.ts";
import { aiRoutes, type AiOptions } from "./routes/ai.ts";
import { applicationRoutes } from "./routes/applications.ts";
import { healthRoutes } from "./routes/health.ts";
import { jobRoutes } from "./routes/jobs.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

export interface AppOptions {
  auth: AuthOptions;
  db: Database;
  ai: AiOptions;
  webAppOrigin: string;
  apiDocs?: boolean;
}

export function buildApp({ auth, db, ai, webAppOrigin, apiDocs = false }: AppOptions) {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate("db", db);

  app.register(fastifyCors, { origin: webAppOrigin, methods: ["GET", "POST", "PUT", "DELETE"] });
  requireAuthentication(app, auth);
  if (apiDocs) serveApiDocs(app, auth);

  app.register(healthRoutes);
  app.register(jobRoutes);
  app.register(applicationRoutes);
  app.register(aiRoutes, ai);

  return app;
}
