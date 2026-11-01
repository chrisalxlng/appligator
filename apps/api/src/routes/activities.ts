import { activityInputSchema, activityListSchema, activitySchema } from "@appligator/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { activities, applications } from "../db/schema.ts";
import { toActivity, toActivityColumns } from "./activityRows.ts";
import { fillEmptyDetails } from "./detailFills.ts";
import { notFoundSchema } from "./notFound.ts";

const applicationParamsSchema = z.object({ id: z.uuid() });
const activityParamsSchema = applicationParamsSchema.extend({ activityId: z.uuid() });

export const activityRoutes: FastifyPluginAsyncZod = async (app) => {
  async function ownsApplication(id: string, userId: string) {
    const [application] = await app.db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)));
    return Boolean(application);
  }

  const activityOf = (applicationId: string, activityId: string) =>
    and(eq(activities.id, activityId), eq(activities.applicationId, applicationId));

  app.get(
    "/applications/:id/activities",
    {
      schema: {
        params: applicationParamsSchema,
        response: { 200: activityListSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      if (!(await ownsApplication(id, request.userId))) {
        return reply.code(404).send({ error: "Not Found" });
      }

      const rows = await app.db
        .select()
        .from(activities)
        .where(eq(activities.applicationId, id))
        .orderBy(desc(activities.occurredAt), desc(activities.createdAt));
      return rows.map(toActivity);
    },
  );

  app.post(
    "/applications/:id/activities",
    {
      schema: {
        params: applicationParamsSchema,
        body: activityInputSchema,
        response: { 201: activitySchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      if (!(await ownsApplication(id, request.userId))) {
        return reply.code(404).send({ error: "Not Found" });
      }

      const row = await app.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(activities)
          .values({ ...toActivityColumns(request.body), applicationId: id })
          .returning();
        if (request.body.terms) await fillEmptyDetails(tx, id, request.body.terms);
        return inserted!;
      });
      return reply.code(201).send(toActivity(row));
    },
  );

  app.put(
    "/applications/:id/activities/:activityId",
    {
      schema: {
        params: activityParamsSchema,
        body: activityInputSchema,
        response: { 200: activitySchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { id, activityId } = request.params;
      if (!(await ownsApplication(id, request.userId))) {
        return reply.code(404).send({ error: "Not Found" });
      }

      const { terms } = request.body;
      const row = await app.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(activities)
          .set({
            ...toActivityColumns(request.body),
            detailsReviewed: sql`case when ${activities.terms} is not distinct from ${terms && JSON.stringify(terms)}::jsonb then ${activities.detailsReviewed} else false end`,
            updatedAt: new Date(),
          })
          .where(activityOf(id, activityId))
          .returning();
        if (updated && terms) await fillEmptyDetails(tx, id, terms);
        return updated;
      });
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return toActivity(row);
    },
  );

  app.put(
    "/applications/:id/activities/:activityId/details-review",
    {
      schema: {
        params: activityParamsSchema,
        response: { 204: z.null(), 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { id, activityId } = request.params;
      if (!(await ownsApplication(id, request.userId))) {
        return reply.code(404).send({ error: "Not Found" });
      }

      const [row] = await app.db
        .update(activities)
        .set({ detailsReviewed: true })
        .where(activityOf(id, activityId))
        .returning({ id: activities.id });
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );

  app.delete(
    "/applications/:id/activities/:activityId",
    {
      schema: {
        params: activityParamsSchema,
        response: { 204: z.null(), 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { id, activityId } = request.params;
      if (!(await ownsApplication(id, request.userId))) {
        return reply.code(404).send({ error: "Not Found" });
      }

      const [row] = await app.db
        .delete(activities)
        .where(activityOf(id, activityId))
        .returning({ id: activities.id });
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );
};
