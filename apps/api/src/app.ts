import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { requireAuthentication, type AuthOptions } from "./auth.ts";
import { healthRoutes } from "./routes/health.ts";

export function buildApp(authOptions: AuthOptions) {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  requireAuthentication(app, authOptions);

  app.register(healthRoutes);

  return app;
}
