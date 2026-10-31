import { sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";

const defaultPageSize = 30;
const maxPageSize = 100;
const cursorSeparator = "|";

const cursorSchema = z
  .base64url()
  .transform((cursor) => Buffer.from(cursor, "base64url").toString().split(cursorSeparator))
  .pipe(z.tuple([z.iso.datetime({ precision: 6 }), z.uuid()]))
  .transform(([createdAt, id]) => ({ createdAt, id }));

export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(maxPageSize).default(defaultPageSize),
  cursor: cursorSchema.optional(),
});

type Cursor = z.infer<typeof cursorSchema>;

interface PageColumns {
  id: PgColumn;
  createdAt: PgColumn;
}

// The cursor keeps the full microsecond precision of Postgres, which a JavaScript Date would lose.
export function cursorCreatedAt({ createdAt }: PageColumns) {
  return sql<string>`to_char(${createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}

export function afterCursor({ id, createdAt }: PageColumns, cursor: Cursor | undefined) {
  if (!cursor) return undefined;
  return sql`(${createdAt}, ${id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)` as SQL;
}

interface PageRow {
  id: string;
  createdAt: Date;
  cursorCreatedAt: string;
}

export function toPage<Row extends PageRow>(rows: Row[], limit: number) {
  const pageRows = rows.slice(0, limit);
  const lastRow = pageRows.at(-1);

  return {
    items: pageRows.map(({ cursorCreatedAt: _cursorCreatedAt, createdAt, ...row }) => ({
      ...row,
      createdAt: createdAt.toISOString(),
    })),
    nextCursor:
      rows.length > limit && lastRow ? encodeCursor(lastRow.cursorCreatedAt, lastRow.id) : null,
  };
}

function encodeCursor(createdAt: string, id: string) {
  return Buffer.from(`${createdAt}${cursorSeparator}${id}`).toString("base64url");
}
