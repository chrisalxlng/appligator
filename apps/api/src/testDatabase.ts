import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./db/schema.ts";

export async function createTestDatabase() {
  const db = drizzle({ client: new PGlite(), schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  return db;
}
