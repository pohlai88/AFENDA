import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required");

  const client = new Client({
    connectionString: url,
    application_name: "afenda-drizzle-migrate",
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

    console.log("✅ migrations applied");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
