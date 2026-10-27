# Appligator

Monorepo built with [Vite+](https://viteplus.dev).

## Structure

| Path              | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `apps/web`        | Web client: client-side rendered React app with TanStack Router |
| `apps/api`        | Backend: Fastify app                                            |
| `packages/ui`     | UI components based on Base UI, design tokens and Storybook     |
| `packages/shared` | Schemas and types shared between web and API                    |

## Development

The app requires a login via Keycloak. Locally, the Keycloak of the [cl-dev](https://github.com/chrisalxlng/cl-dev) setup must run at http://localhost:8080 with the `appligator-app` client in the `apps` realm. The web app reads its Keycloak settings from `apps/web/.env.development`; the API reads `KEYCLOAK_ISSUER` and `KEYCLOAK_CLIENT_ID` and defaults to the local Keycloak.

- Install dependencies:

```bash
vp install
```

- Start the web app (http://localhost:5173) and the API (http://localhost:3000):

```bash
vp run dev
```

- Start Storybook (http://localhost:6006):

```bash
vp run storybook
```

- Format, lint, type check, test and build everything:

```bash
vp run ready
```
