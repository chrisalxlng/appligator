import type { FastifyInstance } from "fastify";
import { jwtVerify, type JWTVerifyGetKey } from "jose";

declare module "fastify" {
  interface FastifyContextConfig {
    public?: boolean;
  }
}

export interface AuthOptions {
  issuer: string;
  clientId: string;
  keys: JWTVerifyGetKey;
}

export function requireAuthentication(
  app: FastifyInstance,
  { issuer, clientId, keys }: AuthOptions,
) {
  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.config.public) return;

    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];

    try {
      if (!token) throw new Error("Missing bearer token");
      const { payload } = await jwtVerify(token, keys, { issuer });
      if (payload.azp !== clientId) throw new Error("Token was issued for another client");
    } catch (error) {
      request.log.info({ reason: String(error) }, "Rejected unauthenticated request");
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });
}
