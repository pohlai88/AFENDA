---

## Plan: ERP-Grade Schema Governance — Full Sweep

All three tiers of PostgreSQL glossary concepts folded into one plan alongside the original schema-invariants work. The plan is organized into **4 phases** (from highest-ROI structural enforcement to future-looking architectural upgrades), with 14 total steps.

---

### Phase A — Structural Invariants & Helpers (Steps 1–4)

**Goal:** Extract shared helpers, fix existing violations, enforce invariants via CI gates.

**Step 1 — Extract `_helpers.ts`**

Create packages/db/src/schema/_helpers.ts containing:
- `tsz()` (timestamp helper) — currently duplicated across all 5 schema files
- `rlsOrg` (RLS policy builder) — duplicated across all 5 schema files
- `rlsPrincipal` — currently only in `iam.ts`
- New: `orgIdCol()` — standardized `orgId` column definition returning `uuid('org_id').notNull()`
- New: `updatedAtCol()` — returns `tsz('updated_at').$defaultFn(() => new Date())`

Update all 5 schema files (iam.ts, finance.ts, document.ts, supplier.ts, infra.ts) to import from `./_helpers.js` and delete their local duplicates.

**Step 2 — Add Check Constraints to Drizzle Schema**

The research revealed that `party.kind` and `iam_principal.kind` have `CHECK` constraints in SQL (migration 0003) but **no** `check()` in iam.ts — despite importing `check` (unused). Fix:
- Add `check('party_kind_check', sql\`kind IN ('person','organization')\`)` to `party` table definition
- Add `check('principal_kind_check', sql\`kind IN ('user','service')\`)` to `iamPrincipal` table definition
- This closes the Drizzle ↔ SQL drift gap so `drizzle-kit generate` won't produce a conflicting migration

**Step 3 — Fix Missing Indexes & `updatedAt` Columns**

Create migration 0010_schema_invariants.sql:

*Missing FK indexes (6):*
| Table | Column | Index Name |
|-------|--------|------------|
| `invoice_status_history` | `invoice_id` | `inv_status_history_invoice_idx` |
| `journal_entry` | `source_invoice_id` | `journal_entry_source_invoice_idx` |
| `journal_entry` | `reversal_of_id` | `journal_entry_reversal_idx` |
| `evidence` | `document_id` | `evidence_document_idx` |
| `evidence_operation` | `document_id` | `evidence_op_document_idx` |
| `audit_log` | `actor_principal_id` | `audit_log_actor_idx` |

*Missing `updatedAt` columns (add to mutable, non-append-only tables):*
| Table | Action |
|-------|--------|
| `party` | ADD `updated_at` + backfill from `now()` |
| `iam_principal` | ADD `updated_at` + backfill |
| `party_role` | ADD `updated_at` + backfill |
| `iam_role` | ADD `updated_at` + backfill |
| `invoice` | ADD `updated_at` + backfill |

*Skip `updatedAt` for append-only/immutable tables:*
Allowlist: `audit_log`, `outbox_event`, `invoice_status_history`, `journal_entry`, `journal_line`, `evidence_operation`, `document`, `evidence`, `person` (immutable PII record), `organization` (slug-immutable), `iam_permission` (seed data), `iam_role_permission`, `iam_principal_role`, `dead_letter_job`.

*Also add `ANALYZE` calls* at the end of the migration for all altered tables — this ensures the query planner has fresh statistics after the backfill:
```sql
ANALYZE party, iam_principal, party_role, iam_role, invoice;
```

Update the corresponding Drizzle schema files to declare the new `updatedAt` columns and indexes so Drizzle stays in sync with SQL.

**Step 4 — Create `schema-invariants.mjs` Gate**

New file tools/gates/schema-invariants.mjs with 5 rule codes:

| Rule Code | What It Checks |
|-----------|----------------|
| `ORG_SCOPED_UNIQUE` | Every `unique(...)` or `uniqueIndex(...)` on a table with `orgId` must include `orgId` as the first column. Handles nullable columns correctly (PG allows multiple nulls in unique constraints — flag if a non-`orgId` column in the unique is nullable without a partial `WHERE` clause). |
| `FK_MUST_BE_INDEXED` | Every `.references(...)` column must have a corresponding `index(...)` or `uniqueIndex(...)`. Composite FKs count if covered by a composite index. |
| `MUTABLE_REQUIRES_UPDATED_AT` | Tables not in the append-only/immutable allowlist must have an `updatedAt` column. Allowlist is a `Set` at the top of the file. |
| `CHECK_CONSTRAINT_DRIFT` | If a table column uses a `*Values` enum from contracts (detected via the import pattern), verify that a `check()` or `pgEnum()` is declared on that column in the Drizzle schema — not just in SQL migrations. Catches the `party.kind` / `iam_principal.kind` class of drift. |
| `RELATIONS_SIZE_WARNING` | Warn (non-fatal) if relations.ts exceeds 500 lines — signal to split into domain-specific relation files. |

Pattern: follows `catalog.mjs` structure — `RULE_DOCS` map, `suggestFix` map, uses `reportViolations`/`reportSuccess` from reporter.mjs. Parses schema `.ts` files via regex (same approach as `boundaries.mjs`).

---

### Phase B — Migration Lint & DB-Level Triggers (Steps 5–7)

**Goal:** Prevent dangerous migrations, add a DB-level `updated_at` trigger so app code can never forget.

**Step 5 — Create `migration-lint.mjs` Gate**

New file tools/gates/migration-lint.mjs with 4 rule codes:

| Rule Code | What It Checks |
|-----------|----------------|
| `MIGRATION_DESTRUCTIVE_NO_GUARD` | `DROP TABLE`, `DROP COLUMN`, `ALTER TABLE ... DROP` without a preceding comment `-- DESTRUCTIVE:` explaining why. Prevents accidental data loss. |
| `MIGRATION_ADD_NOT_NULL_NO_DEFAULT` | `ADD COLUMN ... NOT NULL` without a `DEFAULT` — will fail on non-empty tables. |
| `MIGRATION_ENUM_CHANGE` | `ALTER TYPE ... ADD VALUE` or `ALTER TYPE ... RENAME VALUE` — flag for review (enum changes can't be rolled back inside a transaction). |
| `MIGRATION_MISSING_ANALYZE` | Data migrations (files containing `UPDATE ... SET` or `INSERT ... SELECT`) that don't end with `ANALYZE` — catches stale statistics after bulk changes. |

Scans all `.sql` files in drizzle (skipping the `meta/` subdirectory).

**Step 6 — Create `set_updated_at()` Trigger Function + Migration**

Create migration 0011_updated_at_trigger.sql:

```sql
-- Shared trigger function for all mutable tables
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Then attach a `BEFORE UPDATE` trigger to every mutable table that has `updated_at`:
`party`, `iam_principal`, `party_role`, `iam_role`, `invoice`, `account`, `supplier`, `idempotency`, `sequence`.

This makes `updatedAt` enforcement **impossible to forget** — the DB sets it automatically regardless of whether the app code remembers to. Follows the same pattern as the existing `prevent_audit_log_mutation()` trigger in 0002_audit_log_append_only.sql.

**Step 7 — Register Gates + `FORCE ROW LEVEL SECURITY`**

- Add `schema-invariants.mjs` and `migration-lint.mjs` to the `GATES` array in run-gates.mjs (currently 3 entries → becomes 5)
- Create migration 0012_force_rls.sql: Apply `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to all 15 tables that have RLS policies. Currently deferred to "Sprint 2" per the comment in iam.ts — this is Sprint 2. Without `FORCE`, the table owner role **bypasses all RLS policies**.

---

### Phase C — Operational Hardening (Steps 8–10)

**Goal:** Autovacuum tuning, TOAST awareness, connection pool hardening, `UNLOGGED` evaluation.

**Step 8 — Autovacuum Tuning Migration**

Create migration 0013_autovacuum_tuning.sql:

| Table | Setting | Rationale |
|-------|---------|-----------|
| `outbox_event` | `autovacuum_vacuum_scale_factor = 0.01`, `autovacuum_analyze_scale_factor = 0.02` | High churn: constant INSERT + UPDATE `delivered=true` + periodic DELETE. Default 20% threshold is too high for a table that churns 100% of rows. |
| `idempotency` | `autovacuum_vacuum_scale_factor = 0.02` | 24h TTL cleanup creates constant dead tuples. |
| `sequence` | `autovacuum_vacuum_scale_factor = 0.0`, `autovacuum_vacuum_threshold = 50` | Tiny table (~10 rows) with constant UPDATEs. Default scale factor (20%) would mean vacuum runs every ~2 rows. Fixed threshold is more appropriate. |
| `audit_log` | `autovacuum_vacuum_scale_factor = 0.05` | Append-only, no dead tuples from UPDATE/DELETE, but high volume means the initial insert visibility map needs frequent updates. |

Syntax: `ALTER TABLE tablename SET (autovacuum_vacuum_scale_factor = N);`

**Step 9 — TOAST & JSONB Documentation in OWNERS.md**

Update OWNERS.md with a new **TOAST & Large Objects** section documenting:

| Table.Column | Type | Risk | Guidance |
|---|---|---|---|
| `outbox_event.payload` | `jsonb NOT NULL` | High — unbounded event payloads | Keep payloads under 2KB when possible; large payloads trigger TOAST compression + out-of-line storage. Consider `STORAGE EXTERNAL` if payloads are already compressed. |
| `dead_letter_job.payload` | `jsonb NOT NULL` | High — mirrors outbox | Same as above |
| `audit_log.details` | `jsonb nullable` | Medium | Typically small; no action needed |
| `journal_line.dimensions` | `jsonb nullable` | Low | Constrained `Record<string,string>` |
| `idempotency.response_headers` | `jsonb nullable` | Low | Small HTTP header object |

Also add a **Data Security Posture** section documenting:
- `journal_line` has no `orgId` / no RLS — relies on FK join through `journal_entry` for isolation
- `dead_letter_job` has nullable `orgId` / no RLS — intentional for global jobs
- Why these design choices are acceptable and what invariants they depend on

**Step 10 — Evaluate `UNLOGGED` for `idempotency`**

Document the tradeoff in OWNERS.md (do NOT apply yet — requires team decision):
- **Pro:** `UNLOGGED` skips WAL writes → ~2× faster INSERT/UPDATE; data loss on crash is acceptable because idempotency claims have a 24h TTL and are self-healing (worst case: a duplicate request goes through once after crash)
- **Con:** Not replicated to read replicas; data lost on crash recovery; can't do point-in-time recovery for this table
- **Recommendation**: Apply in a future migration after read-replica story is clarified. If the team decides yes, the migration is a single `ALTER TABLE idempotency SET UNLOGGED;`

---

### Phase D — Future Architecture & Documentation (Steps 11–14)

**Goal:** PG schemas, grants, domains, extension governance, and cleanup.

**Step 11 — PG Domain Types (Evaluate)**

Document a proposal in OWNERS.md for future domain types:

| Domain | Definition | Tables Affected |
|--------|-----------|----------------|
| `org_id` | `CREATE DOMAIN org_id AS uuid NOT NULL` | 15 tables with `orgId` |
| `money_amount` | `CREATE DOMAIN money_amount AS integer NOT NULL CHECK (VALUE >= 0)` | `journal_line.amount_cents`, `invoice.total_cents` |

**Not for this PR** — Drizzle ORM doesn't natively support `CREATE DOMAIN` in schema definitions. Would require all `orgId` columns to be declared as `customType` in Drizzle, which adds complexity. Document for future evaluation when Drizzle adds domain support or when the team moves fully to hand-written migrations.

**Step 12 — PG Schemas Namespace Proposal**

Document in OWNERS.md the architectural path toward PG schemas:

| PG Schema | Maps To | Tables |
|-----------|---------|--------|
| `iam` | iam.ts | 10 IAM tables |
| `finance` | finance.ts | 5 finance tables |
| `document` | document.ts | 3 document tables |
| `supplier` | supplier.ts | 1 table |
| `infra` | infra.ts | 5 infra tables |

Benefits: per-schema `GRANT` (defense-in-depth), `search_path` controls, clearer naming at 100+ tables. Requires `schemaFilter` in drizzle.config.ts, `schema:` option on each `pgTable`, and a large migration to `ALTER TABLE SET SCHEMA`. **Deferred** — not practical until the table count warrants it (50+).

**Step 13 — PG Grants & Roles Proposal**

Document the defense-in-depth model:
- `afenda_api` role — `SELECT, INSERT, UPDATE` on business tables; no `DELETE` except on `idempotency`, `outbox_event`
- `afenda_worker` role — `SELECT, INSERT, UPDATE, DELETE` on `outbox_event`, `dead_letter_job`; read-only on business tables
- `afenda_migrator` role — superuser equivalent, used only by migration runner
- Requires `GRANT` statements in a migration + connection string per role. **Deferred** — depends on deployment topology.

**Step 14 — Cleanup & Drift Resolution**

- Delete tenant.entity.ts (all exports `@deprecated`, dead code from pre-ADR-0003)
- Remove its re-export from index.ts
- Backport 5 missing SQL-only indexes/constraints into Drizzle schema to close the drift gap:
  - `person_email_uidx` (partial index) → add to `iam.ts`
  - `idempotency_expires_at_idx` → add to `infra.ts`
  - `supplier_org_name_uidx`, `supplier_org_external_uidx` → add to `supplier.ts`
  - `audit_log_org_time_idx` → add to `infra.ts`
  - `party_kind_idx` → add to `iam.ts`
- Add extension gate rule to `migration-lint.mjs`: `MIGRATION_MISSING_EXTENSION` — if a migration uses a function from a known extension (e.g., `gen_random_uuid`, `pgcrypto`, `pg_trgm`), verify there's a `CREATE EXTENSION IF NOT EXISTS` somewhere in the migration set. (Currently no extensions are used — `gen_random_uuid()` is built-in since PG 13 — but this gates future usage.)
- Consolidate the 4 `set_config()` calls in client.ts into a single `SELECT` call for performance.

---

### Verification

| Check | Command / Action |
|-------|-----------------|
| Build | `pnpm turbo build` — 7/7 packages green |
| Tests | `pnpm turbo test` — 131+ tests pass |
| Gates | `node tools/run-gates.mjs` — all 5 gates pass (boundaries, catalog, test-location, schema-invariants, migration-lint) |
| Migration | Apply 0010–0013 against dev DB, verify with `\d+ tablename` for indexes, triggers, autovacuum settings |
| RLS | Verify `FORCE ROW LEVEL SECURITY` with a query as table owner role — should be filtered |
| Trigger | `UPDATE supplier SET name='test' WHERE id=...` → verify `updated_at` auto-set without app code |

### Decisions

- **Triggers over app code** for `updated_at`: chose DB-level enforcement because it's impossible to bypass, following the `prevent_audit_log_mutation()` precedent in migration 0002
- **`FORCE RLS` now**: the comment says "Sprint 2" — this is Sprint 2; without it, table owner bypasses all policies
- **Domains and PG schemas deferred**: Drizzle ORM doesn't support `CREATE DOMAIN` natively; PG schemas require a large migration and `search_path` management. Document the path but don't execute yet.
- **`UNLOGGED` for idempotency deferred**: requires team decision on read-replica topology
- **Grants deferred**: requires per-service connection strings and deployment topology decisions
- **4 migrations (0010–0013)** rather than one monolith: each is independently deployable and reviewable
- **Extend `migration-lint`** with `MIGRATION_MISSING_ANALYZE` and `MIGRATION_MISSING_EXTENSION` — catches two real gaps found in the existing migration set (0004 has no `ANALYZE` after bulk INSERT, no extensions declared)