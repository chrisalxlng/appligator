import {
  applicationCreateSchema,
  applicationInputSchema,
  applicationListPageSchema,
  applicationSchema,
  applicationStatusCountsSchema,
  applicationStatuses,
  pinInputSchema,
} from "@appligator/shared";
import { and, count, eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { applications, jobs } from "../db/schema.ts";
import { notFoundSchema } from "./notFound.ts";
import { afterCursor, cursorCreatedAt, pageOrder, pageQuerySchema, toPage } from "./pagination.ts";
import { fromSalaryColumns, toSalaryColumns } from "./salaryColumns.ts";
import { sortByStatus } from "./statusCounts.ts";

type ApplicationRow = typeof applications.$inferSelect;
type JobRow = typeof jobs.$inferSelect;

const applicationParamsSchema = z.object({ id: z.uuid() });

const applicationListQuerySchema = pageQuerySchema.extend({
  status: z.enum(applicationStatuses).optional(),
});

const alreadyAppliedSchema = z.object({ error: z.literal("alreadyApplied") });

function toApplication(
  { userId: _userId, jobId, createdAt, updatedAt, ...row }: ApplicationRow,
  job: { position: string },
) {
  return {
    ...fromSalaryColumns(row),
    job: { id: jobId, position: job.position },
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function jobDetailColumns({
  id: _id,
  userId: _userId,
  link: _link,
  description: _description,
  summary: _summary,
  applicationDeadline: _applicationDeadline,
  viewedAt: _viewedAt,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
  ...columns
}: JobRow) {
  return columns;
}

export const applicationRoutes: FastifyPluginAsyncZod = async (app) => {
  const ownApplication = (id: string, userId: string) =>
    and(eq(applications.id, id), eq(applications.userId, userId));

  async function findApplication(id: string, userId: string) {
    const [result] = await app.db
      .select({ application: applications, job: { position: jobs.position } })
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
        params: applicationParamsSchema,
        response: { 200: applicationSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const result = await findApplication(request.params.id, request.userId);

      if (!result) return reply.code(404).send({ error: "Not Found" });
      return toApplication(result.application, result.job);
    },
  );

  app.post(
    "/applications",
    {
      schema: {
        body: applicationCreateSchema,
        response: { 201: applicationSchema, 404: notFoundSchema, 409: alreadyAppliedSchema },
      },
    },
    async (request, reply) => {
      const { jobId, appliedAt } = request.body;
      const [job] = await app.db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, jobId), eq(jobs.userId, request.userId)));
      if (!job) return reply.code(404).send({ error: "Not Found" });

      const [existing] = await app.db
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.jobId, jobId));
      if (existing) return reply.code(409).send({ error: "alreadyApplied" });

      const [row] = await app.db
        .insert(applications)
        .values({
          ...jobDetailColumns(job),
          userId: request.userId,
          jobId,
          status: "applied",
          appliedAt,
        })
        .returning();

      return reply.code(201).send(toApplication(row!, job));
    },
  );

  app.put(
    "/applications/:id/pin",
    {
      schema: {
        params: applicationParamsSchema,
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
        params: applicationParamsSchema,
        body: applicationInputSchema,
        response: { 200: applicationSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const [row] = await app.db
        .update(applications)
        .set({ ...toSalaryColumns(request.body), updatedAt: new Date() })
        .where(ownApplication(request.params.id, request.userId))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not Found" });

      const [job] = await app.db
        .select({ position: jobs.position })
        .from(jobs)
        .where(eq(jobs.id, row.jobId));
      return toApplication(row, job!);
    },
  );

  app.delete(
    "/applications/:id",
    {
      schema: {
        params: applicationParamsSchema,
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
