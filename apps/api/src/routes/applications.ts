import {
  applicationCreateSchema,
  applicationStatusOf,
  type ActivityInput,
  applicationInputSchema,
  applicationListPageSchema,
  applicationSchema,
  applicationStatusCountsSchema,
  applicationStatuses,
  pinInputSchema,
} from "@appligator/shared";
import { and, count, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { activities, applications, jobs } from "../db/schema.ts";
import { maxActivityBodyBytes, toActivityColumns } from "./activityRows.ts";
import { reviewTermsOfChangedDetails } from "./detailFills.ts";
import { idParamsSchema } from "./idParams.ts";
import { notFoundSchema } from "./notFound.ts";
import { afterCursor, cursorCreatedAt, pageOrder, pageQuerySchema, toPage } from "./pagination.ts";
import { fromSalaryColumns, toSalaryColumns } from "./salaryColumns.ts";
import { sortByStatus } from "./statusCounts.ts";

type ApplicationRow = typeof applications.$inferSelect;

const applicationListQuerySchema = pageQuerySchema.extend({
  status: z.enum(applicationStatuses).optional(),
});

const alreadyAppliedSchema = z.object({ error: z.literal("alreadyApplied") });

const appliedAt = sql<Date | null>`(
  select min(${activities.occurredAt}) from ${activities}
  where ${activities.applicationId} = ${applications.id}
    and ${activities.type} = 'applicationSubmitted'
)`.mapWith(activities.occurredAt);

interface ApplicationResult {
  application: ApplicationRow;
  job: { position: string };
  appliedAt: Date | null;
}

function toApplication({ application, job, appliedAt }: ApplicationResult) {
  const { userId: _userId, jobId, createdAt, updatedAt, ...row } = application;
  return {
    ...fromSalaryColumns(row),
    appliedAt: appliedAt?.toISOString() ?? null,
    job: { id: jobId, position: job.position },
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function submittedDetails({ terms, notes }: ActivityInput, job: { position: string }) {
  if (!terms) return { position: job.position, notes };
  const { position, ...details } = terms;
  return { ...toSalaryColumns(details), position: position ?? job.position, notes };
}

export const applicationRoutes: FastifyPluginAsyncZod = async (app) => {
  const ownApplication = (id: string, userId: string) =>
    and(eq(applications.id, id), eq(applications.userId, userId));

  async function findApplication(id: string, userId: string) {
    const [result] = await app.db
      .select({ application: applications, job: { position: jobs.position }, appliedAt })
      .from(applications)
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .where(ownApplication(id, userId));
    return result;
  }

  app.get(
    "/applications",
    {
      schema: {
        querystring: applicationListQuerySchema,
        response: { 200: applicationListPageSchema },
      },
    },
    async (request) => {
      const { limit, cursor, status } = request.query;
      const rows = await app.db
        .select({
          id: applications.id,
          company: applications.company,
          position: applications.position,
          status: applications.status,
          pinned: applications.pinned,
          createdAt: applications.createdAt,
          cursorCreatedAt: cursorCreatedAt(applications),
        })
        .from(applications)
        .where(
          and(
            eq(applications.userId, request.userId),
            status ? eq(applications.status, status) : undefined,
            afterCursor(applications, cursor),
          ),
        )
        .orderBy(...pageOrder(applications))
        .limit(limit + 1);

      return toPage(rows, limit);
    },
  );

  app.get(
    "/applications/status-counts",
    { schema: { response: { 200: applicationStatusCountsSchema } } },
    async (request) => {
      const rows = await app.db
        .select({ status: applications.status, count: count() })
        .from(applications)
        .where(eq(applications.userId, request.userId))
        .groupBy(applications.status);

      return sortByStatus(rows, applicationStatuses);
    },
  );

  app.get(
    "/applications/:id",
    {
      schema: {
        params: idParamsSchema,
        response: { 200: applicationSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const result = await findApplication(request.params.id, request.userId);

      if (!result) return reply.code(404).send({ error: "Not Found" });
      return toApplication(result);
    },
  );

  app.post(
    "/applications",
    {
      bodyLimit: maxActivityBodyBytes,
      schema: {
        body: applicationCreateSchema,
        response: { 201: applicationSchema, 404: notFoundSchema, 409: alreadyAppliedSchema },
      },
    },
    async (request, reply) => {
      const { jobId, activity } = request.body;
      const [job] = await app.db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, jobId), eq(jobs.userId, request.userId)));
      if (!job) return reply.code(404).send({ error: "Not Found" });

      const created = await app.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(applications)
          .values({
            ...submittedDetails(activity, job),
            userId: request.userId,
            jobId,
            company: job.company,
            pinned: job.pinned,
            status: applicationStatusOf([activity.type]),
          })
          .onConflictDoNothing({ target: applications.jobId })
          .returning({ id: applications.id });
        if (!row) return undefined;

        await tx
          .insert(activities)
          .values({ ...toActivityColumns(activity), applicationId: row.id });
        return row;
      });
      if (!created) return reply.code(409).send({ error: "alreadyApplied" });

      return reply
        .code(201)
        .send(toApplication((await findApplication(created.id, request.userId))!));
    },
  );

  app.put(
    "/applications/:id/pin",
    {
      schema: {
        params: idParamsSchema,
        body: pinInputSchema,
        response: { 204: z.null(), 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const [row] = await app.db
        .update(applications)
        .set({ pinned: request.body.pinned })
        .where(ownApplication(request.params.id, request.userId))
        .returning({ id: applications.id });

      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );

  app.put(
    "/applications/:id",
    {
      schema: {
        params: idParamsSchema,
        body: applicationInputSchema,
        response: { 200: applicationSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const previous = await app.db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(applications)
          .where(ownApplication(id, request.userId));
        if (!row) return undefined;

        await tx
          .update(applications)
          .set({ ...toSalaryColumns(request.body), updatedAt: new Date() })
          .where(eq(applications.id, id));
        await reviewTermsOfChangedDetails(tx, id, fromSalaryColumns(row), request.body);
        return row;
      });
      if (!previous) return reply.code(404).send({ error: "Not Found" });

      return toApplication((await findApplication(id, request.userId))!);
    },
  );

  app.delete(
    "/applications/:id",
    {
      schema: {
        params: idParamsSchema,
        response: { 204: z.null(), 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const [row] = await app.db
        .delete(applications)
        .where(ownApplication(request.params.id, request.userId))
        .returning({ id: applications.id });

      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );
};
