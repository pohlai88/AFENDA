---

## Plan: Sprint 2 — Operational Slice

**TL;DR:** 5 deliverables, no n8n, no UI. Audit log queries (read path for the append-only audit table), MarkPaid command (new invoice transition `posted→paid` with DB migration), worker voided→GL-reversal projection, minimal OTel bootstrap, and integration tests for all new exit criteria. Every deliverable follows the exact Sprint 1 patterns: discriminated union results, `withAudit()` transactions, `CursorPage<T>` pagination, `ZodTypeProvider` routes, raw-SQL worker handlers, boundary-compliant test seeds. Target: Build 7/7, Tests 180+, Gates 8/8.

**Steps**

### Phase A — Contracts (packages/contracts)

**1.** Add `"invoice.paid"` to `AuditActionValues` in audit.ts. Add `"payment"` to `AuditEntityTypeValues` (for future payment-entity audit trails — keep symmetry with `SequenceEntityTypeValues` which already has `"payment"`).

**2.** Add `"AP_INVOICE_ALREADY_PAID"` to `ErrorCodeValues` in errors.ts — after the existing `AP_INVOICE_ALREADY_VOIDED` entry.

**3.** Add `apInvoiceMarkPaid: "ap.invoice.markpaid"` and `auditLogRead: "audit.log.read"` to the `Permissions` object in the contracts IAM file (find via `Permissions` export — likely contracts/src/iam/iam.permissions.ts or similar).

**4.** Create `MarkPaidCommandSchema` in contracts/src/invoice/invoice.commands.ts — following the exact pattern of `ApproveInvoiceCommandSchema`:
   - Fields: `idempotencyKey: IdempotencyKeySchema`, `invoiceId: InvoiceIdSchema`, `paymentReference: z.string().trim().min(1).max(128)`, `paidAt: DateSchema.optional()` (defaults to server `now()`), `reason: z.string().trim().min(1).max(500).optional()`
   - Export type `MarkPaidCommand`

**5.** Create audit query contracts in new file `contracts/src/shared/audit-query.ts`:
   - `AuditLogFilterSchema` — optional fields: `entityType: AuditEntityTypeSchema`, `entityId: UuidSchema`, `action: AuditActionSchema`, `actorPrincipalId: UuidSchema`, `from: z.coerce.date()`, `to: z.coerce.date()`
   - `AuditLogRowSchema` — mirrors `audit_log` table columns (id, orgId, action, entityType, entityId, actorPrincipalId, correlationId, occurredAt, details)
   - Re-export from contracts/src/shared/index.ts

### Phase B — DB Migration (packages/db)

**6.** Add 3 columns to `invoice` table in finance.ts:
   - `paidAt: tsz("paid_at")` — nullable, set when MarkPaid executes
   - `paidByPrincipalId: uuid("paid_by_principal_id").references(() => iamPrincipal.id, { onDelete: "set null" })` — who marked it paid
   - `paymentReference: text("payment_reference")` — bank ref / check number / wire ID

**7.** Generate migration via `pnpm drizzle-kit generate` → produces `drizzle/0001_mark_paid.sql`. Run `pnpm db:migrate` to apply. The `migration-lint` gate will validate the SQL automatically.

### Phase C — Core Services (packages/core)

**8.** Add `markPaid()` to core/src/finance/ap/invoice.service.ts — follow exact pattern of `approveInvoice()`:
   - Signature: `async function markPaid(db: DbClient, ctx: OrgScopedContext, policyCtx: PolicyContext, correlationId: CorrelationId, params: MarkPaidParams): Promise<InvoiceServiceResult<{ id: InvoiceId }>>`
   - Permission check: `policyCtx.permissionsSet.has(Permissions.apInvoiceMarkPaid)` — return `IAM_INSUFFICIENT_PERMISSIONS` if denied
   - Pre-transaction: fetch invoice by ID + org, verify exists, verify `status === "posted"` (TRANSITIONS map already allows `posted→paid`)
   - `withAudit()` transaction: UPDATE invoice SET `status='paid', paidAt, paidByPrincipalId, paymentReference, updatedAt` WHERE `id = invoiceId AND orgId AND status = 'posted'` (TOCTOU), INSERT `invoice_status_history` row (posted→paid), INSERT outbox event `AP.INVOICE_PAID`
   - Audit: action `"invoice.paid"`, entityType `"invoice"`
   - Return `{ ok: true, data: { id } }` on success

**9.** Create `core/src/infra/audit-queries.ts` — follow exact pattern of core/src/finance/ap/invoice.queries.ts:
   - `listAuditLogs(db, orgId, params: AuditLogListParams)` → `CursorPage<AuditLogRow>` — cursor-paginated, filtered by optional `entityType`, `entityId`, `action`, `actorPrincipalId`, `from`/`to` date range. Cursor encoding: base64url UUID, limit+1 fetch pattern.
   - `getAuditTrail(db, orgId, entityType, entityId)` → `AuditLogRow[]` — all audit entries for a specific entity, ordered by `occurredAt DESC`. No pagination (bounded by entity lifecycle).
   - Import `auditLog` table from `@afenda/db`, import types from `@afenda/contracts`
   - Map Drizzle rows to plain camelCase objects (same as invoice.queries.ts)

**10.** Update core/src/infra/index.ts — add `export * from "./audit-queries.js";`

**11.** Add `canMarkPaid` policy function to core/src/finance/sod.ts — returns `PolicyResult`. Check `permissionsSet.has(Permissions.apInvoiceMarkPaid)`.

### Phase D — API Routes (apps/api)

**12.** Add `POST /v1/commands/mark-paid` route to api/src/routes/invoices.ts — follow exact pattern of approve-invoice route:
   - Rate limit: `{ max: 30, timeWindow: "1 minute" }`
   - Guards: `requireOrg()` → `requireAuth()`
   - Schema: body `MarkPaidCommandSchema`, responses 201/400/401/403/404/409
   - Call `markPaid(app.db, ctx, policyCtx, correlationId, body)` → map result
   - Add `"AP_INVOICE_ALREADY_PAID"` to `mapErrorStatus()` → 409

**13.** Create new route file audit.ts — follow pattern of gl.ts:
   - `GET /v1/audit-logs` — cursor-paginated, querystring extends `CursorParamsSchema` with optional `entityType`, `entityId`, `action`, `actorPrincipalId`, `from`, `to` filters. Permission guard: `audit.log.read`. Call `listAuditLogs()`.
   - `GET /v1/audit-logs/:entityType/:entityId` — returns full entity audit trail. Permission guard: `audit.log.read`. Call `getAuditTrail()`.
   - Register in api/src/index.ts alongside existing route registrations under `/v1`

### Phase E — Worker Handlers (apps/worker)

**14.** Add `handle_invoice_paid` task to worker:
   - New file `apps/worker/src/jobs/handle-invoice-paid.ts` — follows handle-journal-posted.ts pattern. Log-only for now (notification dispatch is Sprint 3 / n8n). Future: trigger bank feed reconciliation.
   - Register in worker/src/index.ts task list
   - Add `AP.INVOICE_PAID` case to dispatcher worker/src/jobs/process-outbox-event.ts

**15.** Add GL auto-reversal logic to worker/src/jobs/handle-invoice-voided.ts:
   - Use `helpers.withPgClient()` (same pattern as handle-journal-posted.ts)
   - Query: `SELECT id, entry_number FROM journal_entry WHERE source_invoice_id = $1 AND org_id = $2 AND reversal_of IS NULL` — find original (non-reversal) journal entries linked to the voided invoice
   - For each found entry: enqueue a `handle_reverse_journal` job with `{ journalEntryId, orgId, correlationId, reason: "Auto-reversal: invoice voided" }` — or call raw SQL directly to insert the reversal entry (following the same pattern as `postToGL`'s reversal logic but via raw SQL in the worker)
   - TOCTOU-safe: only reverse entries that haven't already been reversed (`reversal_of IS NULL` and no entry with `reversal_of = this.id` exists)

### Phase F — OpenTelemetry (packages/core + apps/api + apps/worker)

**16.** Add OTel dependencies to pnpm catalog in pnpm-workspace.yaml: `@opentelemetry/api@1.9.0`, `@opentelemetry/sdk-node@0.212.0`, `@opentelemetry/auto-instrumentations-node@0.70.1`. Add to package.json dependencies.

**17.** Create `core/src/infra/telemetry.ts`:
   - `initTelemetry(serviceName: string)` function — creates `NodeSDK` with `getNodeAutoInstrumentations()` (HTTP, pg, Fastify auto-detected). OTLP exporter configured via env `OTEL_EXPORTER_OTLP_ENDPOINT` (defaults to `http://localhost:4318`). Returns SDK instance for graceful shutdown.
   - Guard: `if (!process.env["OTEL_ENABLED"])` return no-op — don't break dev/test environments
   - Update core/src/infra/index.ts to re-export

**18.** Call `initTelemetry("afenda-api")` at top of api/src/index.ts (before Fastify build, behind `OTEL_ENABLED` guard). Call `initTelemetry("afenda-worker")` at top of worker/src/index.ts.

### Phase G — Test Seeds & Integration Tests

**19.** Update test seed in global-setup.ts:
   - Add `"ap.invoice.markpaid"` and `"audit.log.read"` to seeded permissions
   - Grant `ap.invoice.markpaid` to the **operator** role (same principal who submits — no SoD conflict since posted→paid is a finance-ops action, not an approval)
   - Grant `audit.log.read` to both operator and approver roles

**20.** Add test helpers in factories.ts:
   - `markPaidPayload(invoiceId, overrides?)` — returns `{ idempotencyKey, invoiceId, paymentReference: "WIRE-TEST-001" }`
   - Update `resetDb()` if the new migration adds tables (unlikely — columns only)

**21.** Write 5 new integration test files:
   - `mark-paid-lifecycle.test.ts` (EC-S2-1): Submit → approve → post-to-GL → mark-paid. Verify status `"paid"`, `paidAt`/`paymentReference` set, outbox event `AP.INVOICE_PAID` emitted, status history row (posted→paid).
   - `mark-paid-sod.test.ts` (EC-S2-2): Verify non-authorized principal gets `IAM_INSUFFICIENT_PERMISSIONS` trying to mark paid.
   - `audit-queries.test.ts` (EC-S2-3): Submit invoice, then query `GET /v1/audit-logs?entityType=invoice&entityId=<id>`. Verify audit row with action `invoice.submitted`, correct correlationId. Test cursor pagination with multiple audit entries.
   - `audit-trail.test.ts` (EC-S2-4): Full lifecycle (submit → approve → post), then query `GET /v1/audit-logs/invoice/:id`. Verify 3+ audit entries in order, each with distinct action.
   - `void-gl-reversal.test.ts` (EC-S2-5): Submit → approve → post-to-GL → void invoice. Verify worker handler auto-reverses the GL entries (check `journal_entry` table for reversal row with `reversal_of` pointing to original).

### Phase H — Governance & Docs

**22.** Update OWNERS.md files:
   - core/src/infra/ — add `audit-queries.ts`, `telemetry.ts`
   - jobs — add `handle-invoice-paid.ts` (if OWNERS.md exists here)
   - Verify all new files appear in their parent OWNERS.md

**23.** Update PROJECT.md:
   - Bump revision to `v0.3-R11`
   - Add R10→R11 changelog with all Sprint 2 changes
   - Mark Sprint 2 tasks 2.1, 2.2, 2.4 as ✅
   - Update Sprint 2 exit criteria with test evidence
   - Update test count in Gap Analysis
   - Keep Sprint 2 status as ✅ if all tasks pass

### Phase I — Verification

**24.** Run full verification pipeline:
   - `pnpm build` → expect 7/7
   - `pnpm test` → expect 180+ (166 existing + ~14 new)
   - `node tools/run-gates.mjs` → expect 8/8
   - Verify no boundary violations (audit route uses `@afenda/core` for queries, NOT `@afenda/db`)
   - Verify no `new Date()` in new DB-touching code (use `sql\`now()\``)

**Verification**
- `pnpm build` — 7/7 packages
- `pnpm test` — all green (unit + integration)
- `node tools/run-gates.mjs` — 8/8 gates
- Manual: `POST /v1/commands/mark-paid`, `GET /v1/audit-logs` via Scalar docs at `/v1/docs`

**Decisions**
- MarkPaid: new permission `ap.invoice.markpaid` (dedicated SoD, not reusing approve/post)
- n8n: deferred to Sprint 2.5 — Sprint 2 is pure code deliverables
- OTel: minimal SDK + auto-instrumentations, behind `OTEL_ENABLED` env guard
- Worker: only `handle-invoice-voided` gets real logic (GL auto-reversal); other stubs stay log-only until notification infrastructure exists
- DB migration: additive columns only (paid_at, paid_by_principal_id, payment_reference) — no breaking changes, no data migration needed