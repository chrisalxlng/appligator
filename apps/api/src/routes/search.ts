import { ilike, or } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export function matchesSearch(search: string, columns: PgColumn[]) {
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  return or(...columns.map((column) => ilike(column, pattern)));
}
