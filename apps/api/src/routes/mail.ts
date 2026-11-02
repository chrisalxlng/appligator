import {
  activitySchema,
  mailAccountInputSchema,
  mailAccountSchema,
  mailAiAssignmentInputSchema,
  mailAssignmentInputSchema,
  mailErrorSchema,
  mailMessageListPageSchema,
  mailMessageSchema,
  mailMessageStatusCountsSchema,
  mailMessageStatuses,
  mailSyncResultSchema,
} from "@appligator/shared";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { SecretCipher } from "../crypto/secretCipher.ts";
import {
  applications,
  mailAccounts,
  mailAssignments,
  mailMessages,
  type MailContent,
  type MailSuggestion,
} from "../db/schema.ts";
import { assignMessage, unassignMessage } from "../mail/assignMessage.ts";
import type { VerifyMailAccess } from "../mail/mailAccess.ts";
import type { ReadNewMail } from "../mail/mailReader.ts";
import { maxActivityBodyBytes, toActivity } from "./activityRows.ts";
import { idParamsSchema } from "./idParams.ts";
import { notFoundSchema } from "./notFound.ts";
import { afterCursor, cursorCreatedAt, pageQuerySchema, toPage } from "./pagination.ts";
import { sortByStatus } from "./statusCounts.ts";

export interface MailOptions {
  passwordCipher: SecretCipher;
  verifyMailAccess: VerifyMailAccess;
  readNewMail: ReadNewMail;
}

// Each check opens a connection to a server of the user's choice and attempts a login there. The
// hook runs after the authentication.
const connectionRateLimit = { max: 10, timeWindow: "1 minute", hook: "preHandler" } as const;

function toMailAccount({
  host,
  username,
  accessUpdatedAt,
  lastSyncedAt,
  syncError,
  aiAssignment,
}: typeof mailAccounts.$inferSelect) {
  return {
    host,
    username,
    accessUpdatedAt: accessUpdatedAt.toISOString(),
    lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
    syncError,
    aiAssignment,
  };
}

const mailMessageListQuerySchema = pageQuerySchema.extend({
  status: z.enum(mailMessageStatuses).optional(),
});

export const mailRoutes: FastifyPluginAsyncZod<MailOptions> = async (
  app,
  { passwordCipher, verifyMailAccess },
) => {
  app.get(
    "/mail/account",
    { schema: { response: { 200: mailAccountSchema.nullable() } } },
    async (request) => {
      const [row] = await app.db
        .select()
        .from(mailAccounts)
        .where(eq(mailAccounts.userId, request.userId));
      return row ? toMailAccount(row) : null;
    },
  );

  app.put(
    "/mail/account",
    {
      config: { rateLimit: connectionRateLimit },
      schema: {
        body: mailAccountInputSchema,
        response: { 200: mailAccountSchema, 422: mailErrorSchema },
      },
    },
    async (request, reply) => {
      const { userId, body: input } = request;
      const [existing] = await app.db
        .select()
        .from(mailAccounts)
        .where(eq(mailAccounts.userId, userId));
      const keepsMailbox = existing?.host === input.host && existing.username === input.username;

      const error = await verifyMailAccess(input);
      if (error) {
        request.log.info({ code: error }, "Mail access verification failed");
        return reply.code(422).send({ error });
      }

      const access = {
        host: input.host,
        username: input.username,
        encryptedPassword: passwordCipher.encrypt(input.password, userId),
        accessUpdatedAt: new Date(),
        cursors: keepsMailbox ? existing.cursors : {},
        nextSyncAt: new Date(),
        syncError: null,
        syncFailures: 0,
      };
      const [row] = await app.db
        .insert(mailAccounts)
        .values({ ...access, userId })
        .onConflictDoUpdate({ target: mailAccounts.userId, set: access })
        .returning();
      return toMailAccount(row!);
    },
  );

  app.put(
    "/mail/account/ai-assignment",
    {
      schema: {
        body: mailAiAssignmentInputSchema,
        response: { 200: mailAccountSchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const [row] = await app.db
        .update(mailAccounts)
        .set({ aiAssignment: request.body.enabled })
        .where(eq(mailAccounts.userId, request.userId))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return toMailAccount(row);
    },
  );

  app.delete(
    "/mail/account",
    { schema: { response: { 204: z.null(), 404: notFoundSchema } } },
    async (request, reply) => {
      const row = await app.db.transaction(async (tx) => {
        await tx.delete(mailMessages).where(eq(mailMessages.userId, request.userId));
        await tx.delete(mailAssignments).where(eq(mailAssignments.userId, request.userId));
        const [deleted] = await tx
          .delete(mailAccounts)
          .where(eq(mailAccounts.userId, request.userId))
          .returning({ userId: mailAccounts.userId });
        return deleted;
      });

      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/mail/sync",
    {
      config: { rateLimit: connectionRateLimit },
      schema: {
        response: { 200: mailSyncResultSchema, 404: notFoundSchema, 422: mailErrorSchema },
      },
    },
    async (request, reply) => {
      const result = await app.mailSync.syncAccountOf(request.userId);
      if (!result) return reply.code(404).send({ error: "Not Found" });
      if ("error" in result) return reply.code(422).send(result);
      return result;
    },
  );

  const ownMessage = (id: string, userId: string) =>
    and(eq(mailMessages.id, id), eq(mailMessages.userId, userId));

  // Emails can't be pinned, but they share the pages with jobs and applications, which can.
  const notPinned = sql<boolean>`false`;
  const messagePageColumns = {
    id: mailMessages.id,
    pinned: notPinned,
    createdAt: mailMessages.createdAt,
  };

  // The suggested application may have been deleted in the meantime.
  async function resolveSuggestion(suggestion: MailSuggestion | null, userId: string) {
    if (!suggestion) return null;

    const [application] = await app.db
      .select({ id: applications.id, position: applications.position })
      .from(applications)
      .where(and(eq(applications.id, suggestion.applicationId), eq(applications.userId, userId)));
    return application
      ? {
          application,
          activityType: suggestion.activityType,
          appointmentAt: suggestion.appointmentAt,
          dueDate: suggestion.dueDate,
          responseDeadline: suggestion.responseDeadline,
        }
      : null;
  }

  app.get(
    "/mail/messages",
    {
      schema: {
        querystring: mailMessageListQuerySchema,
        response: { 200: mailMessageListPageSchema },
      },
    },
    async (request) => {
      const { limit, cursor, status } = request.query;
      const rows = await app.db
        .select({
          id: mailMessages.id,
          folder: mailMessages.folder,
          status: mailMessages.status,
          content: sql<Omit<MailContent, "body">>`${mailMessages.content} - 'body'`,
          hasSuggestion: sql<boolean>`${mailMessages.suggestion} is not null`,
          pinned: notPinned,
          createdAt: mailMessages.createdAt,
          cursorCreatedAt: cursorCreatedAt(messagePageColumns),
        })
        .from(mailMessages)
        .where(
          and(
            eq(mailMessages.userId, request.userId),
            status ? eq(mailMessages.status, status) : undefined,
            afterCursor(messagePageColumns, cursor),
          ),
        )
        .orderBy(desc(mailMessages.createdAt), desc(mailMessages.id))
        .limit(limit + 1);

      const { items, nextCursor } = toPage(rows, limit);
      return {
        items: items.map(({ pinned: _pinned, content, ...item }) => ({ ...item, ...content })),
        nextCursor,
      };
    },
  );

  app.get(
    "/mail/messages/status-counts",
    { schema: { response: { 200: mailMessageStatusCountsSchema } } },
    async (request) => {
      const rows = await app.db
        .select({ status: mailMessages.status, count: count() })
        .from(mailMessages)
        .where(eq(mailMessages.userId, request.userId))
        .groupBy(mailMessages.status);
      return sortByStatus(rows, mailMessageStatuses);
    },
  );

  app.get(
    "/mail/messages/:id",
    {
      schema: { params: idParamsSchema, response: { 200: mailMessageSchema, 404: notFoundSchema } },
    },
    async (request, reply) => {
      const [row] = await app.db
        .select({
          id: mailMessages.id,
          folder: mailMessages.folder,
          status: mailMessages.status,
          content: mailMessages.content,
          suggestion: mailMessages.suggestion,
          createdAt: mailMessages.createdAt,
          application: { id: applications.id, position: applications.position },
        })
        .from(mailMessages)
        .leftJoin(applications, eq(applications.id, mailMessages.applicationId))
        .where(ownMessage(request.params.id, request.userId));
      if (!row) return reply.code(404).send({ error: "Not Found" });

      const { content, createdAt, suggestion, ...message } = row;
      return {
        ...message,
        ...content,
        hasSuggestion: suggestion !== null,
        suggestion: await resolveSuggestion(suggestion, request.userId),
        createdAt: createdAt.toISOString(),
      };
    },
  );

  app.post(
    "/mail/messages/:id/assignment",
    {
      bodyLimit: maxActivityBodyBytes,
      schema: {
        params: idParamsSchema,
        body: mailAssignmentInputSchema,
        response: { 201: activitySchema, 404: notFoundSchema },
      },
    },
    async (request, reply) => {
      const { applicationId, activity } = request.body;
      const [application] = await app.db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.userId, request.userId)));
      if (!application) return reply.code(404).send({ error: "Not Found" });

      const row = await app.db.transaction((tx) =>
        assignMessage(tx, {
          messageWhere: and(
            ownMessage(request.params.id, request.userId),
            inArray(mailMessages.status, ["pending", "dismissed"]),
          ),
          applicationId,
          activity,
          automatic: false,
        }),
      );
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(201).send(toActivity(row));
    },
  );

  app.delete(
    "/mail/messages/:id/assignment",
    { schema: { params: idParamsSchema, response: { 204: z.null(), 404: notFoundSchema } } },
    async (request, reply) => {
      const [message] = await app.db
        .select()
        .from(mailMessages)
        .where(
          and(
            ownMessage(request.params.id, request.userId),
            inArray(mailMessages.status, ["assigned", "autoAssigned"]),
          ),
        );
      if (!message) return reply.code(404).send({ error: "Not Found" });

      await app.db.transaction((tx) => unassignMessage(tx, message));
      return reply.code(204).send(null);
    },
  );

  app.delete(
    "/mail/messages/:id",
    { schema: { params: idParamsSchema, response: { 204: z.null(), 404: notFoundSchema } } },
    async (request, reply) => {
      const [row] = await app.db
        .update(mailMessages)
        .set({ status: "dismissed" })
        .where(
          and(ownMessage(request.params.id, request.userId), eq(mailMessages.status, "pending")),
        )
        .returning({ id: mailMessages.id });
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );
};
