import { jobInputSchema, jobListItemSchema, jobSchema, type JobInput } from "@appligator/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { jobs } from "../db/schema.ts";

type JobRow = typeof jobs.$inferSelect;

const jobParamsSchema = z.object({ id: z.uuid() });
const notFoundSchema = z.object({ error: z.literal("Not Found") });

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
    { schema: { response: { 200: z.array(jobListItemSchema) } } },
    async (request) => {
      const rows = await app.db
        .select({
          id: jobs.id,
          company: jobs.company,
          position: jobs.position,
          createdAt: jobs.createdAt,
        })
        .from(jobs)
        .where(eq(jobs.userId, request.userId))
        .orderBy(desc(jobs.createdAt));

      return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
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
