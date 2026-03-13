-- Durable idempotency table for shared conventions PostgresIdempotencyStore.
-- Note: AFENDA also has an org-scoped idempotency table in packages/db/schema.
-- This standalone table is intended for simple key-based idempotency use cases.

CREATE TABLE IF NOT EXISTS idempotency (
  key text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('in-progress','completed','failed')),
  result jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON idempotency (expires_at);
