# Appligator

Monorepo built with [Vite+](https://viteplus.dev).

## Structure

| Path              | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `apps/web`        | Web client: client-side rendered React app with TanStack Router |
| `apps/api`        | Backend: Fastify app with PostgreSQL via Drizzle ORM            |
| `apps/extension`  | Chrome extension to import job ads from the browser             |
| `packages/ui`     | UI components based on Base UI and Tiptap, tokens and Storybook |
| `packages/shared` | Schemas and types shared between web and API                    |

## Development

The app requires a login via Keycloak. Locally, the Keycloak of the [cl-dev](https://github.com/chrisalxlng/cl-dev) setup must run at http://localhost:8080 with the `appligator-app` client in the `apps` realm. The web app reads its Keycloak settings from `apps/web/.env.development`; the API requires `KEYCLOAK_ISSUER` and `KEYCLOAK_CLIENT_ID`, which `vp run dev` loads from `apps/api/.env.development`. Like `DATABASE_URL`, values set in the environment take precedence and the API fails to start if one is missing.

The web app calls the API under `/api` on its own origin. `vp run dev` proxies these requests to the API at http://localhost:3000; in production, a reverse proxy must forward `/api` to the API and strip the prefix.

The API stores its data in PostgreSQL. Locally, the `appligator-db` database of the cl-dev setup must run at `localhost:5433`. The API requires `DATABASE_URL`; `vp run dev` and the database tasks load it from `apps/api/.env.development`, and a `DATABASE_URL` set in the environment takes precedence. Tests run against an in-memory PostgreSQL ([PGlite](https://pglite.dev)) and need no database.

The API applies pending migrations from `apps/api/drizzle` on startup, before it accepts requests, and doesn't start if one fails. A deployment therefore needs `apps/api/drizzle` next to `apps/api/dist`.

Users connect their own AI API key (OpenAI, Anthropic, Google or Mistral) on the profile page. The API encrypts these keys with AES-256-GCM using a key derived from `AI_API_KEY_ENCRYPTION_KEY`. `vp run dev` loads the placeholder `dev-only-example-key` from `apps/api/.env.development`; production must set a long random secret instead (e.g. `openssl rand -base64 32`) and keep it stable, because changing it makes stored API keys unreadable. The selectable models come from the [models.dev](https://models.dev) catalog, which the API caches for a day.

- Install dependencies:

```bash
vp install
```

- Generate a migration in `apps/api/drizzle` after changing the schema in `apps/api/src/db/schema.ts`; the API applies it on its next start:

```bash
vp run @appligator/api#db:generate
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

## Chrome extension

The extension submits the job ad in the active tab to the API (`POST /ai/job-import`). The API reduces the page to the job ad (the schema.org `JobPosting` data if the page has one, otherwise numbered text blocks of which the AI picks the job ad), lets the AI extract the job and creates it. Pages can be several megabytes, so a reverse proxy in front of the API must accept request bodies of up to 20 MB on this route. Users log in with the `appligator-app` Keycloak client, which must allow the redirect URI `chrome-extension://ikefecjehkhnchneifagjlnepkmikdan/auth-callback.html`. The `key` in the manifest (`apps/extension/vite.config.ts`) pins this extension ID for every installation.

The extension reads its URLs from `apps/extension/.env.development` (`vp run @appligator/extension#dev`, local web app, API and Keycloak) or `.env.production` (`vp run @appligator/extension#build` and `#zip`).

- Build the extension into `apps/extension/dist` and rebuild it on every change:

```bash
vp run @appligator/extension#dev
```

- Package the production build as `apps/extension/appligator-extension.zip`:

```bash
vp run @appligator/extension#zip
```

### Installation

The extension is not published in the Chrome Web Store. To install it in Chrome (or Edge, Brave and other Chromium browsers):

1. Unzip `appligator-extension.zip` into a folder that stays in place, as the browser loads the extension from there.
2. Open `chrome://extensions` and turn on **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the unzipped folder (or `apps/extension/dist` during development).
4. Pin Appligator via the puzzle icon in the toolbar, click it and log in.

For an update, replace the folder's content with the new version and click the reload icon of Appligator on `chrome://extensions`.
