import type { FastifyInstance } from "fastify";
import { jwtVerify, type JWTVerifyGetKey } from "jose";

declare module "fastify" {
  interface FastifyContextConfig {
    public?: boolean;
  }

  interface FastifyRequest {
    userId: string;
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
  app.decorateRequest("userId", "");

  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.config.public) return;

    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];

    try {
      if (!token) throw new Error("Missing bearer token");
      const { payload } = await jwtVerify(token, keys, { issuer });
      if (payload.azp !== clientId) throw new Error("Token was issued for another client");
      if (!payload.sub) throw new Error("Token has no subject");
      request.userId = payload.sub;
    } catch (error) {
      request.log.info({ reason: String(error) }, "Rejected unauthenticated request");
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });
}
