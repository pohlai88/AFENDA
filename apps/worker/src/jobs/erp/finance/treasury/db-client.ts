import { createDb } from "@afenda/core";
import type { DbClient } from "@afenda/db";

let dbInstance: DbClient | null = null;

export function getWorkerDb(): DbClient {
  if (dbInstance) return dbInstance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("[treasury-worker] DATABASE_URL not set");
  }

  ({ db: dbInstance } = createDb(url));
  return dbInstance;
}
