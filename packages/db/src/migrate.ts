import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

async function main() {
  // Prefer direct connection for migrations (DDL, advisory locks, CREATE INDEX CONCURRENTLY)
  const url =
    process.env["DATABASE_URL_MIGRATIONS"]?.trim() || process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL or DATABASE_URL_MIGRATIONS is required");

  const client = new Client({
    connectionString: url,
    application_name: "afenda-drizzle-migrate",
    // Neon cold start: allow 10s for scale-to-zero resume
    ...(url.includes("neon.tech") && { connectionTimeoutMillis: 10_000 }),
  });

  await client.connect();

  try {
    // Safety knobs — prevent hangs in CI / production deploys
    await client.query("SET statement_timeout = '5min'");
    await client.query("SET lock_timeout = '30s'");

    // gen_random_uuid() comes from pgcrypto — not a PG built-in.
    // Must be installed before any migration that references it.
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

    const db = drizzle(client);
    await migrate(db, { migrationsFolder: resolve(__dirname, "../drizzle") });

    process.stdout.write("✅ migrations applied\n");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
