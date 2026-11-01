import { activityInputSchema, activityListSchema, activitySchema } from "@appligator/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { activities, applications } from "../db/schema.ts";
import { maxActivityBodyBytes, toActivity, toActivityColumns } from "./activityRows.ts";
import { updateApplicationStatus } from "./applicationStatus.ts";
import { fillEmptyDetails } from "./detailFills.ts";
import { idParamsSchema } from "./idParams.ts";
import { notFoundSchema } from "./notFound.ts";

const activityParamsSchema = idParamsSchema.extend({ activityId: z.uuid() });

export const activityRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("preHandler", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [application] = await app.db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, request.userId)));
    if (!application) return reply.code(404).send({ error: "Not Found" });
  });

  const activityOf = (applicationId: string, activityId: string) =>
    and(eq(activities.id, activityId), eq(activities.applicationId, applicationId));

  app.get(
    "/applications/:id/activities",
    {
      schema: {
        params: idParamsSchema,
        response: { 200: activityListSchema, 404: notFoundSchema },
      },
    },
    async (request) => {
      const rows = await app.db
        .select()
        .from(activities)
        .where(eq(activities.applicationId, request.params.id))
        .orderBy(desc(activities.occurredAt), desc(activities.createdAt));
      return rows.map(toActivity);
    },
  );

  app.post(
    "/applications/:id/activities",
    {
      bodyLimit: maxActivityBodyBytes,
      schema: {
        params: idParamsSchema,
        body: activityInputSchema,
        response: { 201: activitySchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const row = await app.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(activities)
          .values({ ...toActivityColumns(request.body), applicationId: id })
          .returning();
        if (request.body.terms) await fillEmptyDetails(tx, id, request.body.terms);
        await updateApplicationStatus(tx, id);
        return inserted!;
      });
      return reply.code(201).send(toActivity(row));
    },
  );

  app.put(
    "/applications/:id/activities/:activityId",
    {
      bodyLimit: maxActivityBodyBytes,
      schema: {
        params: activityParamsSchema,
        body: activityInputSchema,
        response: { 200: activitySchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { id, activityId } = request.params;
      const { terms } = request.body;
      const row = await app.db.transaction(async (tx) => {
        const [previous] = await tx
          .select({ terms: activities.terms })
          .from(activities)
          .where(activityOf(id, activityId));
        if (!previous) return undefined;

        const [updated] = await tx
          .update(activities)
          .set({
            ...toActivityColumns(request.body),
            detailsReviewed: sql`case when ${activities.terms} is not distinct from ${terms && JSON.stringify(terms)}::jsonb then ${activities.detailsReviewed} else false end`,
            updatedAt: new Date(),
          })
          .where(activityOf(id, activityId))
          .returning();
        if (terms) await fillEmptyDetails(tx, id, terms, previous.terms);
        await updateApplicationStatus(tx, id);
        return updated!;
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
      const row = await app.db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(activities)
          .where(activityOf(id, activityId))
          .returning({ id: activities.id });
        if (deleted) await updateApplicationStatus(tx, id);
        return deleted;
      });
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );
};
