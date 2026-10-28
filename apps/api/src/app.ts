import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { requireAuthentication, type AuthOptions } from "./auth.ts";
import type { Database } from "./db/database.ts";
import { aiRoutes, type AiOptions } from "./routes/ai.ts";
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
}

export function buildApp({ auth, db, ai }: AppOptions) {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate("db", db);

  requireAuthentication(app, auth);

  app.register(healthRoutes);
  app.register(jobRoutes);
  app.register(aiRoutes, ai);

  return app;
}
