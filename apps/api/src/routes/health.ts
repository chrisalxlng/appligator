import { healthResponseSchema } from "@appligator/shared";
import { sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      config: { public: true },
      schema: { response: { 200: healthResponseSchema, 503: healthResponseSchema } },
    },
    async (request, reply) => {
      try {
        await app.db.execute(sql`select 1`);
        return { status: "ok" as const };
      } catch (error) {
        request.log.error(error, "Database is unreachable");
        return reply.code(503).send({ status: "unavailable" });
      }
    },
  );
};
