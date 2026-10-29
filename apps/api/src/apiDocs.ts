import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import packageJson from "../package.json" with { type: "json" };

export interface ApiDocsOptions {
  issuer: string;
  clientId: string;
}

type TransformInput = Parameters<typeof jsonSchemaTransform>[0];

function describeRoute(input: TransformInput) {
  const result = jsonSchemaTransform(input);
  const tag = input.url.split("/")[1];
  const security = input.route.config?.public ? { security: [] } : {};
  return { ...result, schema: { ...result.schema, tags: [tag], ...security } };
}

export function serveApiDocs(app: FastifyInstance, { issuer, clientId }: ApiDocsOptions) {
  app.register(fastifySwagger, {
    openapi: {
      info: { title: "Appligator API", version: packageJson.version },
      components: {
        securitySchemes: {
          keycloak: {
            type: "oauth2",
            flows: {
              authorizationCode: {
                authorizationUrl: `${issuer}/protocol/openid-connect/auth`,
                tokenUrl: `${issuer}/protocol/openid-connect/token`,
                scopes: { openid: "OpenID Connect" },
              },
            },
          },
        },
      },
      security: [{ keycloak: ["openid"] }],
    },
    transform: describeRoute,
  });

  app.register(async (docs) => {
    docs.addHook("onRoute", (route) => {
      route.config = { ...route.config, public: true };
    });
    await docs.register(fastifySwaggerUi, {
      routePrefix: "/docs",
      initOAuth: { clientId, scopes: ["openid"], usePkceWithAuthorizationCodeGrant: true },
    });
  });
}
