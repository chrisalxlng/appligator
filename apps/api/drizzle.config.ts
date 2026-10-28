import { defineConfig } from "drizzle-kit";
import { requireEnv } from "./src/env.ts";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: requireEnv("DATABASE_URL") },
  strict: true,
  verbose: true,
});
