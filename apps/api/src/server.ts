import { buildApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "localhost";

const app = buildApp();

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
