import { healthResponseSchema } from "@appligator/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/health", { schema: { response: { 200: healthResponseSchema } } }, async () => ({
    status: "ok" as const,
  }));
};
