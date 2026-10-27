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
