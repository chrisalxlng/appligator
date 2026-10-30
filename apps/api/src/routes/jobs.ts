import { jobInputSchema, jobListPageSchema, jobSchema, type JobInput } from "@appligator/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { jobs } from "../db/schema.ts";
import { notFoundSchema } from "./notFound.ts";

type JobRow = typeof jobs.$inferSelect;

const jobParamsSchema = z.object({ id: z.uuid() });

const defaultPageSize = 30;
const maxPageSize = 100;
const cursorSeparator = "|";

// The cursor keeps the full microsecond precision of Postgres, which a JavaScript Date would lose.
const cursorCreatedAt = sql<string>`to_char(${jobs.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

function encodeCursor(createdAt: string, id: string) {
  return Buffer.from(`${createdAt}${cursorSeparator}${id}`).toString("base64url");
}

const cursorSchema = z
  .base64url()
  .transform((cursor) => Buffer.from(cursor, "base64url").toString().split(cursorSeparator))
  .pipe(z.tuple([z.iso.datetime({ precision: 6 }), z.uuid()]))
  .transform(([createdAt, id]) => ({ createdAt, id }));

const jobListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(maxPageSize).default(defaultPageSize),
  cursor: cursorSchema.optional(),
});

export function toColumns({ salary, ...input }: JobInput) {
  return {
    ...input,
    salaryCurrency: salary?.currency ?? null,
    salaryPeriod: salary?.period ?? null,
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
  };
}

export function toJob({
  userId: _userId,
  salaryCurrency,
  salaryPeriod,
  salaryMin,
  salaryMax,
  createdAt,
  updatedAt,
  ...row
}: JobRow) {
  const hasSalary =
    salaryCurrency !== null && salaryPeriod !== null && salaryMin !== null && salaryMax !== null;

  return {
    ...row,
    salary: hasSalary
      ? { currency: salaryCurrency, period: salaryPeriod, min: salaryMin, max: salaryMax }
      : null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export const jobRoutes: FastifyPluginAsyncZod = async (app) => {
  const ownJob = (id: string, userId: string) => and(eq(jobs.id, id), eq(jobs.userId, userId));

  app.get(
    "/jobs",
    { schema: { querystring: jobListQuerySchema, response: { 200: jobListPageSchema } } },
    async (request) => {
      const { limit, cursor } = request.query;
      const rows = await app.db
        .select({
          id: jobs.id,
          company: jobs.company,
          position: jobs.position,
          createdAt: jobs.createdAt,
          cursorCreatedAt,
        })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, request.userId),
            cursor &&
              sql`(${jobs.createdAt}, ${jobs.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
          ),
        )
        .orderBy(desc(jobs.createdAt), desc(jobs.id))
        .limit(limit + 1);

      const pageRows = rows.slice(0, limit);
      const lastRow = pageRows.at(-1);

      return {
        items: pageRows.map(({ cursorCreatedAt: _cursorCreatedAt, createdAt, ...row }) => ({
          ...row,
          createdAt: createdAt.toISOString(),
        })),
        nextCursor:
          rows.length > limit && lastRow ? encodeCursor(lastRow.cursorCreatedAt, lastRow.id) : null,
      };
    },
  );

  app.get(
    "/jobs/:id",
    { schema: { params: jobParamsSchema, response: { 200: jobSchema, 404: notFoundSchema } } },
    async (request, reply) => {
      const [row] = await app.db
        .select()
        .from(jobs)
        .where(ownJob(request.params.id, request.userId));

      if (!row) return reply.code(404).send({ error: "Not Found" });
      return toJob(row);
    },
  );

  app.post(
    "/jobs",
    { schema: { body: jobInputSchema, response: { 201: jobSchema } } },
    async (request, reply) => {
      const [row] = await app.db
        .insert(jobs)
        .values({ ...toColumns(request.body), userId: request.userId })
        .returning();

      return reply.code(201).send(toJob(row!));
    },
  );

  app.put(
    "/jobs/:id",
    {
      schema: {
        params: jobParamsSchema,
        body: jobInputSchema,
        response: { 200: jobSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const [row] = await app.db
        .update(jobs)
        .set({ ...toColumns(request.body), updatedAt: new Date() })
        .where(ownJob(request.params.id, request.userId))
        .returning();

      if (!row) return reply.code(404).send({ error: "Not Found" });
      return toJob(row);
    },
  );

  app.delete(
    "/jobs/:id",
    { schema: { params: jobParamsSchema, response: { 204: z.null(), 404: notFoundSchema } } },
    async (request, reply) => {
      const [row] = await app.db
        .delete(jobs)
        .where(ownJob(request.params.id, request.userId))
        .returning({ id: jobs.id });

      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );
};
