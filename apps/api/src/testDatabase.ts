import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./db/schema.ts";

export function createTestDatabase() {
  return drizzle({ client: new PGlite(), schema });
}
