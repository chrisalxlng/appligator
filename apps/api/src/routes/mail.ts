import {
  activitySchema,
  type MailFolder,
  mailAccountInputSchema,
  mailAccountSchema,
  mailAssignmentInputSchema,
  mailErrorSchema,
  mailMessageCountSchema,
  mailMessageListSchema,
  mailMessageSchema,
} from "@appligator/shared";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { SecretCipher } from "../crypto/secretCipher.ts";
import { applications, mailAccounts, mailMessages, type MailContent } from "../db/schema.ts";
import type { VerifyMailAccess } from "../mail/mailAccess.ts";
import { insertActivity, maxActivityBodyBytes, toActivity } from "./activityRows.ts";
import { idParamsSchema } from "./idParams.ts";
import { notFoundSchema } from "./notFound.ts";

export interface MailOptions {
  passwordCipher: SecretCipher;
  verifyMailAccess: VerifyMailAccess;
}

// Each check opens a connection to a server of the user's choice and attempts a login there. The
// hook runs after the authentication.
const connectionRateLimit = { max: 10, timeWindow: "1 minute", hook: "preHandler" } as const;

// Pending emails are deleted after a while, so the list stays small enough to not need pages.
const maxListedMessages = 100;

function toMailAccount({
  host,
  username,
  accessUpdatedAt,
  lastSyncedAt,
  syncError,
}: typeof mailAccounts.$inferSelect) {
  return {
    host,
    username,
    accessUpdatedAt: accessUpdatedAt.toISOString(),
    lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
    syncError,
  };
}

function toMailMessage<Content extends Omit<MailContent, "body">>({
  id,
  folder,
  content,
  createdAt,
}: {
  id: string;
  folder: MailFolder;
  content: Content | null;
  createdAt: Date;
}) {
  return { id, folder, ...content!, receivedAt: createdAt.toISOString() };
}

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

  app.delete(
    "/mail/account",
    { schema: { response: { 204: z.null(), 404: notFoundSchema } } },
    async (request, reply) => {
      const row = await app.db.transaction(async (tx) => {
        await tx.delete(mailMessages).where(eq(mailMessages.userId, request.userId));
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

  const pendingOf = (userId: string) =>
    and(eq(mailMessages.userId, userId), eq(mailMessages.status, "pending"));
  const pendingMessage = (id: string, userId: string) =>
    and(eq(mailMessages.id, id), pendingOf(userId));

  app.get(
    "/mail/messages",
    { schema: { response: { 200: mailMessageListSchema } } },
    async (request) => {
      const [rows, [total]] = await Promise.all([
        app.db
          .select({
            id: mailMessages.id,
            folder: mailMessages.folder,
            content: sql<Omit<MailContent, "body">>`${mailMessages.content} - 'body'`,
            createdAt: mailMessages.createdAt,
          })
          .from(mailMessages)
          .where(pendingOf(request.userId))
          .orderBy(desc(mailMessages.createdAt), desc(mailMessages.id))
          .limit(maxListedMessages),
        app.db.select({ count: count() }).from(mailMessages).where(pendingOf(request.userId)),
      ]);
      return { items: rows.map(toMailMessage), total: total!.count };
    },
  );

  app.get(
    "/mail/messages/count",
    { schema: { response: { 200: mailMessageCountSchema } } },
    async (request) => {
      const [total] = await app.db
        .select({ count: count() })
        .from(mailMessages)
        .where(pendingOf(request.userId));
      return total!;
    },
  );

  app.get(
    "/mail/messages/:id",
    {
      schema: { params: idParamsSchema, response: { 200: mailMessageSchema, 404: notFoundSchema } },
    },
    async (request, reply) => {
      const [row] = await app.db
        .select()
        .from(mailMessages)
        .where(pendingMessage(request.params.id, request.userId));
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return toMailMessage(row);
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

      const row = await app.db.transaction(async (tx) => {
        const [message] = await tx
          .update(mailMessages)
          .set({ status: "assigned", content: null })
          .where(pendingMessage(request.params.id, request.userId))
          .returning({ id: mailMessages.id });
        return message ? insertActivity(tx, applicationId, activity) : undefined;
      });
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(201).send(toActivity(row));
    },
  );

  app.delete(
    "/mail/messages/:id",
    { schema: { params: idParamsSchema, response: { 204: z.null(), 404: notFoundSchema } } },
    async (request, reply) => {
      const [row] = await app.db
        .update(mailMessages)
        .set({ status: "dismissed", content: null })
        .where(pendingMessage(request.params.id, request.userId))
        .returning({ id: mailMessages.id });
      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );
};
