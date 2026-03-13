import type { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS idempotency (
      key text PRIMARY KEY,
      status text NOT NULL CHECK (status IN ('in-progress','completed','failed')),
      result jsonb NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at
      ON idempotency (expires_at);
  `);
}

export async function down(pool: Pool): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS idempotency;`);
}
