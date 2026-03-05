import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString: url });
  await client.connect();

  // Ensure pgcrypto for gen_random_uuid() (Postgres < 17 fallback)
  await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

  const db = drizzle(client);
  await migrate(db, { migrationsFolder: resolve(__dirname, "../drizzle") });

  await client.end();
  console.log("✅ migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
