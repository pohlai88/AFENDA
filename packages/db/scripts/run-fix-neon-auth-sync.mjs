#!/usr/bin/env node

/**
 * Apply the Neon Auth → AFENDA identity sync trigger fix.
 * Run once so new OAuth users get membership (and are not redirected back to login).
 *
 * Usage: from repo root: pnpm run neon:auth-sync-fix
 *        or: pnpm -C packages/db node scripts/run-fix-neon-auth-sync.mjs [--backfill]
 * Requires: DATABASE_URL or DATABASE_URL_MIGRATIONS in .env (loaded from repo root)
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
// When run via pnpm -C packages/db, cwd is packages/db; ensure we load env from repo root
const rootsToTry = [repoRoot, process.cwd(), resolve(process.cwd(), "../..")];

function loadEnv() {
  for (const root of rootsToTry) {
    for (const file of [".env.config", ".env", ".env.local"]) {
      try {
        const path = resolve(root, file);
        const content = readFileSync(path, "utf-8");
        for (const line of content.split("\n")) {
          if (line.startsWith("#") || !line.trim()) continue;
          const [key, ...v] = line.split("=");
          if (key && v.length) {
            const value = v.join("=").trim().replace(/^["']|["']$/g, "");
            process.env[key.trim()] = value;
          }
        }
      } catch (_) {}
    }
  }
}

loadEnv();

const url = process.env.DATABASE_URL_MIGRATIONS?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL or DATABASE_URL_MIGRATIONS is required (set in .env or .env.config at repo root).");
  process.exit(1);
}

const sqlPath = resolve(__dirname, "fix-neon-auth-sync-trigger.sql");
const sql = readFileSync(sqlPath, "utf-8");

const backfillSql = `
UPDATE neon_auth."user"
SET name = name
WHERE email IS NOT NULL AND btrim(email) != '';
`;

async function main() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✅ sync_neon_auth_user_to_afenda_identity updated. New OAuth users will get membership in the default org.");

    const backfill = process.argv.includes("--backfill");
    if (backfill) {
      await client.query(backfillSql);
      console.log("✅ Backfill applied: existing Neon Auth users now have membership (if they had email).");
    } else {
      console.log("Tip: Run with --backfill to add membership for existing OAuth users already in neon_auth.user.");
    }
  } catch (err) {
    console.error("Failed to apply trigger fix:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
