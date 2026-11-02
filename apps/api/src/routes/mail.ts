import { mailAccountInputSchema, mailAccountSchema, mailErrorSchema } from "@appligator/shared";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { SecretCipher } from "../crypto/secretCipher.ts";
import { mailAccounts } from "../db/schema.ts";
import type { VerifyMailAccess } from "../mail/mailAccess.ts";
import { notFoundSchema } from "./notFound.ts";

export interface MailOptions {
  passwordCipher: SecretCipher;
  verifyMailAccess: VerifyMailAccess;
}

// Each check opens a connection to a server of the user's choice and attempts a login there. The
// hook runs after the authentication.
const connectionRateLimit = { max: 10, timeWindow: "1 minute", hook: "preHandler" } as const;

function toMailAccount({ host, username, accessUpdatedAt }: typeof mailAccounts.$inferSelect) {
  return { host, username, accessUpdatedAt: accessUpdatedAt.toISOString() };
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
      const [row] = await app.db
        .delete(mailAccounts)
        .where(eq(mailAccounts.userId, request.userId))
        .returning({ userId: mailAccounts.userId });

      if (!row) return reply.code(404).send({ error: "Not Found" });
      return reply.code(204).send(null);
    },
  );
};
