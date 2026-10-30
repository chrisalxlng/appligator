import {
  jobInputSchema,
  jobListPageSchema,
  jobSchema,
  jobStatusCountsSchema,
  jobStatuses,
  type Job,
  type JobStatus,
} from "@appligator/shared";
import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { applications, jobs } from "../db/schema.ts";
import { notFoundSchema } from "./notFound.ts";
import { afterCursor, cursorCreatedAt, pageQuerySchema, toPage } from "./pagination.ts";
import { fromSalaryColumns, toSalaryColumns } from "./salaryColumns.ts";
import { sortByStatus } from "./statusCounts.ts";

type JobRow = typeof jobs.$inferSelect;
type JobApplication = NonNullable<Job["application"]>;

const jobParamsSchema = z.object({ id: z.uuid() });

const jobListQuerySchema = pageQuerySchema.extend({
  status: z.enum(jobStatuses).optional(),
  search: z.string().trim().max(200).optional(),
});

const appliedSchema = z.object({ error: z.literal("applied") });

const jobStatus = sql<JobStatus>`case when ${applications.id} is null then 'open' else 'applied' end`;

function hasStatus(status: JobStatus) {
  return status === "applied" ? isNotNull(applications.id) : isNull(applications.id);
}

function matchesSearch(search: string) {
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  return or(ilike(jobs.company, pattern), ilike(jobs.position, pattern));
}

export function toJob(
  { userId: _userId, createdAt, updatedAt, ...row }: JobRow,
  application: JobApplication | null,
) {
  return {
    ...fromSalaryColumns(row),
    status: application ? ("applied" as const) : ("open" as const),
    application,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export const jobRoutes: FastifyPluginAsyncZod = async (app) => {
  const ownJob = (id: string, userId: string) => and(eq(jobs.id, id), eq(jobs.userId, userId));

  async function findJob(id: string, userId: string) {
    const [result] = await app.db
      .select({
        job: jobs,
        application: {
          id: applications.id,
          position: applications.position,
          status: applications.status,
        },
      })
      .from(jobs)
      .leftJoin(applications, eq(applications.jobId, jobs.id))
      .where(ownJob(id, userId));
    return result;
  }

  app.get(
    "/jobs",
    { schema: { querystring: jobListQuerySchema, response: { 200: jobListPageSchema } } },
    async (request) => {
      const { limit, cursor, status, search } = request.query;
      const rows = await app.db
        .select({
          id: jobs.id,
          company: jobs.company,
          position: jobs.position,
          status: jobStatus,
          createdAt: jobs.createdAt,
          cursorCreatedAt: cursorCreatedAt(jobs),
        })
        .from(jobs)
        .leftJoin(applications, eq(applications.jobId, jobs.id))
        .where(
          and(
            eq(jobs.userId, request.userId),
            status && hasStatus(status),
            search ? matchesSearch(search) : undefined,
            afterCursor(jobs, cursor),
          ),
        )
        .orderBy(desc(jobs.createdAt), desc(jobs.id))
        .limit(limit + 1);

      return toPage(rows, limit);
    },
  );

  app.get(
    "/jobs/status-counts",
    { schema: { response: { 200: jobStatusCountsSchema } } },
    async (request) => {
      const rows = await app.db
        .select({ status: jobStatus, count: count() })
        .from(jobs)
        .leftJoin(applications, eq(applications.jobId, jobs.id))
        .where(eq(jobs.userId, request.userId))
        .groupBy(jobStatus);

      return sortByStatus(rows, jobStatuses);
    },
  );

  app.get(
    "/jobs/:id",
    { schema: { params: jobParamsSchema, response: { 200: jobSchema, 404: notFoundSchema } } },
    async (request, reply) => {
      const result = await findJob(request.params.id, request.userId);

      if (!result) return reply.code(404).send({ error: "Not Found" });
      return toJob(result.job, result.application);
    },
  );

  app.post(
    "/jobs",
    { schema: { body: jobInputSchema, response: { 201: jobSchema } } },
    async (request, reply) => {
      const [row] = await app.db
        .insert(jobs)
        .values({ ...toSalaryColumns(request.body), userId: request.userId })
        .returning();

      return reply.code(201).send(toJob(row!, null));
    },
  );

  app.put(
    "/jobs/:id",
    {
      schema: {
        params: jobParamsSchema,
        body: jobInputSchema,
        response: { 200: jobSchema, 404: notFoundSchema, 409: appliedSchema },
      },
    },
    async (request, reply) => {
      const existing = await findJob(request.params.id, request.userId);
      if (!existing) return reply.code(404).send({ error: "Not Found" });
      if (existing.application) return reply.code(409).send({ error: "applied" });

      const [row] = await app.db
        .update(jobs)
        .set({ ...toSalaryColumns(request.body), updatedAt: new Date() })
        .where(ownJob(request.params.id, request.userId))
        .returning();

      return toJob(row!, null);
    },
  );

  app.delete(
    "/jobs/:id",
    {
      schema: {
        params: jobParamsSchema,
        response: { 204: z.null(), 404: notFoundSchema, 409: appliedSchema },
      },
    },
    async (request, reply) => {
      const existing = await findJob(request.params.id, request.userId);
      if (!existing) return reply.code(404).send({ error: "Not Found" });
      if (existing.application) return reply.code(409).send({ error: "applied" });

      await app.db.delete(jobs).where(ownJob(request.params.id, request.userId));
      return reply.code(204).send(null);
    },
  );
};
