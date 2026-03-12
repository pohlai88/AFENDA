---
name: treasury-domain-architect
description: 'Build AFENDA Treasury as an AP-grade full-stack ERP sub-domain (contracts, db, core, api, worker, web, tests, gates). Use when: treasury module, cash management, bank account, bank statement, reconciliation, liquidity forecast, cash position, payment factory, bank transfer, treasury controls, treasury architecture review, AP-style enterprise workflow.'
argument-hint: 'Describe treasury scope: compact checklist or full end-to-end implementation, and which entities/flows to include first.'
---

# Treasury Domain Architect

Builds the Treasury sub-domain using the same enterprise architecture and quality bar as AP.

## Use this skill when

- You need a new Treasury module following AFENDA schema-is-truth workflow
- You want AP-style Result-typed services, audit, outbox, and org isolation
- You need to review a Treasury implementation and pinpoint architectural mistakes
- You want a repeatable full-stack rollout sequence with completion gates

## Target outcome

Produce an end-to-end Treasury implementation across:

- `packages/contracts/src/erp/finance/treasury/`
- `packages/db/src/schema/erp/finance/treasury/`
- `packages/core/src/erp/finance/treasury/`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/`
- `apps/web/src/app/(erp)/finance/treasury/`
- `__vitest_test__/` coverage + gate verification

## Treasury baseline scope (default)

If the user does not provide entity scope, start with this compact essential pack:

1. `bank-account` (master data, active/inactive)
2. `bank-statement` (header)
3. `bank-statement-line` (append-only ingestion lines)
4. `cash-transfer` (inter-account movement lifecycle)
5. `cash-position-snapshot` (as-of balance view materialization event)
6. `reconciliation-session` (open/matched/closed process)

## Mandatory architecture constraints

- Import Direction Law must be preserved
- Money in minor units as `bigint` only
- DB timestamps are `timestamptz`
- Every mutation command includes `idempotencyKey`
- Every mutation uses `withAudit(...)` and emits outbox event in same transaction
- All reads and writes are org-scoped (`orgId`)
- No `console.*`; use platform logger patterns
- Tests only under `__vitest_test__/`

## Workflow

1. Define Treasury module boundary and first entity slice
2. Write contracts first (entities, commands, status enums)
3. Register shared artifacts (errors, audit actions, permissions, outbox event types)
4. Create Drizzle schema + migration + contract-db sync mapping
5. Implement core services (Result-typed, guard-first, withAudit)
6. Implement query layer (cursor list + detail + org filters)
7. Wire API routes (thin handlers, zod schemas, AP response style)
8. Wire worker handlers for outbox-driven side effects
9. Build web UI screens (list/detail/create/action flows + loading/error states)
10. Add test matrix (guards, success, outbox payload assertions)
11. Update barrels and OWNERS files
12. Run verification (`pnpm typecheck`, targeted tests, `pnpm check:all`)

## Decision points and branching

### Branch A: New Treasury from skeleton

Use when treasury folders are placeholders only.

1. Keep module path as `erp/finance/treasury`
2. Scaffold one vertical slice (`bank-account`) end-to-end
3. Only after tests pass, add remaining entities incrementally

### Branch B: Existing Treasury partial implementation

Use when some tables or services already exist.

1. Audit for AP-pattern parity before adding features
2. Fix architectural gaps first (idempotency, audit, outbox, org filtering)
3. Then add new entities or transitions

### Branch C: Review-only request

Use when user asks to pinpoint mistakes instead of building features.

1. Perform architecture conformance review
2. Rank issues by severity and regression risk
3. Provide exact file-level remediation plan

## Mistake radar (pinpoint and avoid)

Common wrong patterns to reject immediately:

1. Commands without `idempotencyKey`
2. Mutation service writes without `withAudit(...)`
3. Outbox event emitted outside mutation transaction
4. Missing `orgId` filter in queries or updates
5. Using float/number for money instead of `bigint` minor units
6. Missing status transition guards
7. API route importing DB directly instead of core
8. Tests missing outbox payload assertions
9. Truth-table style data updated/deleted instead of append-only behavior
10. Barrel growth beyond readability with no split strategy

## Treasury-specific invariants

1. Reconciliation integrity: matched amount sum cannot exceed statement line amount
2. Transfer integrity: debit and credit legs must be same amount/currency or explicitly FX-linked
3. Cash position reproducibility: snapshots must be derivable from prior balances + posted events
4. Bank account lifecycle: inactive account cannot accept new transfer or statement ingestion
5. Multi-tenant control: cross-org bank account references are always rejected

## Service pattern (required)

Every public service follows:

1. Guard checks first (existence, ownership, status, permission)
2. Execute mutation inside `withAudit(...)`
3. Append status/history rows (no destructive mutation for truth records)
4. Insert outbox event with serialized bigint fields as strings in payload
5. Return Result type:
	- `{ ok: true, data: ... }`
	- `{ ok: false, error: { code, message, meta? } }`

## API pattern (required)

For each Treasury entity:

1. `POST /v1/commands/create-<entity>`
2. `POST /v1/commands/<action>-<entity>` for lifecycle transitions
3. `GET /v1/<entities>` cursor list (stable sort)
4. `GET /v1/<entities>/{id}` detail

Use AP-style schemas and response helpers; handlers remain thin delegates.

## Test completion criteria

For each service function, include:

1. Guard tests (`not found`, invalid state, forbidden, cross-org rejection)
2. Success test with expected return payload
3. Outbox assertion including event `type` and payload field checks
4. Side-effect assertion for status/history updates
5. Query tests for org filter and pagination behavior

## Done definition

Treasury slice is complete only when all are true:

1. Contracts, DB, core, API, worker, web are wired for the selected scope
2. Error codes/audit actions/permissions/outbox types are registered
3. Tests pass for all new services and routes
4. `pnpm typecheck` passes
5. `pnpm check:all` passes

## Suggested prompts

- `/treasury-domain-architect Build bank-account + bank-statement + reconciliation-session end-to-end using AP architecture.`
- `/treasury-domain-architect Review current treasury implementation and list AP-pattern violations by severity.`
- `/treasury-domain-architect Add cash-transfer workflow with audit, outbox, API routes, UI actions, and full tests.`

## First follow-up questions to finalize scope

1. Start with review-only, or implement first vertical slice now?
2. Which first slice: `bank-account`, `bank-statement`, or `cash-transfer`?
3. Do you want compact checklist output or full file-by-file implementation output?
