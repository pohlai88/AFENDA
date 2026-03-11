/**
 * Shared DB client for auth features (challenges, audit outbox).
 * Uses DATABASE_URL; throws when not set.
 *
 * Call closeAuthDb() for graceful shutdown (e.g. tests, custom server).
 * In serverless, the pool is GC'd when the instance is recycled.
 */

import type { DbClient } from "@afenda/db";
import { createDb } from "@afenda/core";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let db: DbClient | null = null;
let pool: ReturnType<typeof createDb>["pool"] | null = null;
let rootEnvLoaded = false;

function parseAndApplyEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadRootEnvOnce(): void {
  if (rootEnvLoaded) return;
  rootEnvLoaded = true;

  // Candidate paths for local and monorepo execution contexts.
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../.env.local"),
  ];

  for (const candidate of candidates) {
    parseAndApplyEnvFile(candidate);
  }
}

export function getAuthDatabaseUrl(): string | null {
  const direct = process.env.DATABASE_URL ?? process.env.DATABASE_URL_MIGRATIONS;
  if (direct) return direct;

  // Attempt to hydrate env vars from root/app .env files when not present in process env.
  loadRootEnvOnce();
  return process.env.DATABASE_URL ?? process.env.DATABASE_URL_MIGRATIONS ?? null;
}

export function getDbForAuth(): DbClient {
  if (db) return db;

  const url = getAuthDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is required for auth DB features.");
  }

  const result = createDb(url);
  db = result.db;
  pool = result.pool;
  return db;
}

/**
 * Close the auth DB pool. Call for graceful shutdown (tests, custom server).
 * Idempotent; safe to call when pool was never created.
 */
export async function closeAuthDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
