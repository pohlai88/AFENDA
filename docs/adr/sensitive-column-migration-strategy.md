# Sensitive Column Migration Strategy

**Context:** When replacing raw sensitive data (e.g. challenge tokens) with hashed values, use a phased migration to minimize risk and avoid keeping raw data longer than necessary.

## Recommended Order

### 1. Add new nullable columns

Add the replacement columns as nullable so existing rows remain valid:

```sql
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "token_hash" text;
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "token_hint" text;
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "attempt_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "max_attempts" integer DEFAULT 5 NOT NULL;
ALTER TABLE "auth_challenges" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
```

**Deploy:** App continues to read/write the old column.

### 2. Backfill hashes for any live rows

If needed, populate the new columns from existing data:

```sql
UPDATE "auth_challenges"
SET "token_hash" = encode(digest("token", 'sha256'), 'hex')
WHERE "token" IS NOT NULL AND "token_hash" IS NULL;
```

- Use the same algorithm the app will use (SHA-256, HMAC, etc.)
- Backfill can run in a separate migration or as part of step 1

### 3. Switch app reads from token to token_hash

- Deploy application code that reads/writes only `token_hash` (and `token_hint` if applicable)
- Ensure no code path still uses the raw token column

### 4. Remove old raw token column entirely

```sql
-- DESTRUCTIVE: Raw token no longer needed; app uses token_hash
ALTER TABLE "auth_challenges" DROP COLUMN IF EXISTS "token";
```

**Important:** Do not keep raw challenge tokens (or other sensitive data) in the database longer than necessary.

## Rationale

- **Phased rollout:** Reduces risk; each step can be deployed and verified separately
- **Backfill before switch:** Ensures data exists before the app depends on it
- **Minimize exposure:** Dropping the raw column reduces blast radius if the DB is compromised
