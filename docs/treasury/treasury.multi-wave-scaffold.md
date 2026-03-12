# AFENDA Treasury Multi-Wave Delivery Scaffold

## Purpose

This plan turns the enterprise Treasury blueprint into an AFENDA build sequence that follows the existing AP architecture and quality gates.

Design goals:

- Deliver value in thin vertical slices, not giant big-bang releases
- Preserve AFENDA architecture law (contracts -> db -> core -> api -> worker -> web)
- Keep every mutation auditable, idempotent, and outbox-driven
- Ship each wave with test evidence and gate compliance

## Delivery model

- Wave = strategic capability increment (4-8 weeks)
- Sprint = implementation unit (1-2 weeks)
- Each sprint ships at least one end-to-end vertical slice

## Expected directory pathways (AFENDA pattern)

Use these paths as the canonical Treasury implementation map.

### Contracts (schema is truth)

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/contracts/src/erp/finance/treasury/OWNERS.md`
- `packages/contracts/src/erp/finance/treasury/bank-account.entity.ts`
- `packages/contracts/src/erp/finance/treasury/bank-account.commands.ts`
- `packages/contracts/src/erp/finance/treasury/bank-statement.entity.ts`
- `packages/contracts/src/erp/finance/treasury/bank-statement.commands.ts`
- `packages/contracts/src/erp/finance/treasury/bank-statement-line.entity.ts`
- `packages/contracts/src/erp/finance/treasury/bank-statement-line.commands.ts`
- `packages/contracts/src/erp/finance/treasury/reconciliation-session.entity.ts`
- `packages/contracts/src/erp/finance/treasury/reconciliation-session.commands.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-payment-batch.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-payment-batch.commands.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-payment-instruction.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-payment-instruction.commands.ts`

### Database schema

- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/bank-account.table.ts`
- `packages/db/src/schema/erp/finance/treasury/bank-statement.table.ts`
- `packages/db/src/schema/erp/finance/treasury/bank-statement-line.table.ts`
- `packages/db/src/schema/erp/finance/treasury/reconciliation-session.table.ts`
- `packages/db/src/schema/erp/finance/treasury/treasury-payment-batch.table.ts`
- `packages/db/src/schema/erp/finance/treasury/treasury-payment-instruction.table.ts`
- `packages/db/drizzle/<timestamp>_treasury_*.sql`

### Core domain services and queries

- `packages/core/src/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/OWNERS.md`
- `packages/core/src/erp/finance/treasury/bank-account.service.ts`
- `packages/core/src/erp/finance/treasury/bank-account.queries.ts`
- `packages/core/src/erp/finance/treasury/bank-statement.service.ts`
- `packages/core/src/erp/finance/treasury/bank-statement.queries.ts`
- `packages/core/src/erp/finance/treasury/reconciliation-session.service.ts`
- `packages/core/src/erp/finance/treasury/reconciliation-session.queries.ts`
- `packages/core/src/erp/finance/treasury/treasury-payment-batch.service.ts`
- `packages/core/src/erp/finance/treasury/treasury-payment-batch.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/*.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/*.test.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-test-builders.ts`

### API routes

- `apps/api/src/routes/erp/finance/treasury.ts`

Notes:

1. Keep command routes under `/v1/commands/*` and query routes under `/v1/*`.
2. Route handlers stay thin and delegate to `@afenda/core`.

### Worker jobs

- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-bank-statement-ingested.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-reconciliation-suggested.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-payment-released.ts`

### Web UI (App Router)

- `apps/web/src/app/(erp)/finance/treasury/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/loading.tsx`
- `apps/web/src/app/(erp)/finance/treasury/error.tsx`
- `apps/web/src/app/(erp)/finance/treasury/bank-accounts/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/bank-statements/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/reconciliation/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/payments/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/*.tsx`
- `apps/web/src/app/(erp)/finance/treasury/actions.ts`

### Cross-cutting registry updates

- `packages/contracts/src/shared/errors.ts`
- `packages/contracts/src/shared/permissions.ts`
- `packages/contracts/src/kernel/governance/audit/actions.ts`
- `packages/contracts/src/kernel/execution/outbox/envelope.ts`
- `tools/gates/contract-db-sync.mjs`

## Wave file manifests

Use these manifests as the concrete file checklist for the first delivery waves.

### Wave 0 manifest: foundation and guardrails

#### Sprint 0.1 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/OWNERS.md`
- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/OWNERS.md`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `apps/web/src/app/(erp)/finance/treasury/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/loading.tsx`
- `apps/web/src/app/(erp)/finance/treasury/error.tsx`
- `apps/web/src/app/(erp)/finance/treasury/actions.ts`

Update:

- `packages/contracts/src/erp/finance/index.ts`
- `packages/core/src/erp/finance/index.ts`
- `apps/api/src/routes/erp/finance/index.ts` or nearest finance route registry
- `apps/worker/src/jobs/erp/finance/index.ts` or nearest finance job registry
- `packages/contracts/src/shared/errors.ts`
- `packages/contracts/src/shared/permissions.ts`
- `packages/contracts/src/kernel/governance/audit/actions.ts`
- `packages/contracts/src/kernel/execution/outbox/envelope.ts`

#### Sprint 0.2 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/treasury-shared.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-shared.commands.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-test-builders.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-shared.test.ts`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`

### Wave 1 manifest: cash visibility and bank data intake

#### Sprint 1.1 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/bank-account.entity.ts`
- `packages/contracts/src/erp/finance/treasury/bank-account.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/bank-account.table.ts`
- `packages/core/src/erp/finance/treasury/bank-account.service.ts`
- `packages/core/src/erp/finance/treasury/bank-account.queries.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/bank-account.service.test.ts`
- `apps/web/src/app/(erp)/finance/treasury/bank-accounts/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/bank-account-list.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/bank-account-form.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_bank_account.sql`

#### Sprint 1.2 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/bank-statement.entity.ts`
- `packages/contracts/src/erp/finance/treasury/bank-statement.commands.ts`
- `packages/contracts/src/erp/finance/treasury/bank-statement-line.entity.ts`
- `packages/contracts/src/erp/finance/treasury/bank-statement-line.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/bank-statement.table.ts`
- `packages/db/src/schema/erp/finance/treasury/bank-statement-line.table.ts`
- `packages/core/src/erp/finance/treasury/bank-statement.service.ts`
- `packages/core/src/erp/finance/treasury/bank-statement.queries.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/bank-statement.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-bank-statement-ingested.ts`
- `apps/web/src/app/(erp)/finance/treasury/bank-statements/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/bank-statement-monitor.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_bank_statement.sql`

### Wave 2 manifest: reconciliation and payment controls

#### Sprint 2.1 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/reconciliation-session.entity.ts`
- `packages/contracts/src/erp/finance/treasury/reconciliation-session.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/reconciliation-session.table.ts`
- `packages/core/src/erp/finance/treasury/reconciliation-session.service.ts`
- `packages/core/src/erp/finance/treasury/reconciliation-session.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/reconciliation-match.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/reconciliation-session.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-reconciliation-suggested.ts`
- `apps/web/src/app/(erp)/finance/treasury/reconciliation/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/reconciliation-workbench.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_reconciliation_session.sql`

#### Sprint 2.2 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/treasury-payment-batch.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-payment-batch.commands.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-payment-instruction.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-payment-instruction.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/treasury-payment-batch.table.ts`
- `packages/db/src/schema/erp/finance/treasury/treasury-payment-instruction.table.ts`
- `packages/core/src/erp/finance/treasury/treasury-payment-batch.service.ts`
- `packages/core/src/erp/finance/treasury/treasury-payment-batch.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/payment-routing.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-payment-batch.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-payment-released.ts`
- `apps/web/src/app/(erp)/finance/treasury/payments/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/payment-approval-queue.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_payment_factory.sql`

### Wave 3 manifest: liquidity planning and cash positioning

#### Sprint 3.1 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/cash-position-snapshot.entity.ts`
- `packages/contracts/src/erp/finance/treasury/cash-position-snapshot.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/cash-position-snapshot.table.ts`
- `packages/core/src/erp/finance/treasury/cash-position-snapshot.service.ts`
- `packages/core/src/erp/finance/treasury/cash-position-snapshot.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/cash-position.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/cash-position-snapshot.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-cash-position-snapshot-requested.ts`
- `apps/web/src/app/(erp)/finance/treasury/cash-position/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/cash-position-dashboard.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_cash_position_snapshot.sql`

#### Sprint 3.2 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/liquidity-forecast.entity.ts`
- `packages/contracts/src/erp/finance/treasury/liquidity-forecast.commands.ts`
- `packages/contracts/src/erp/finance/treasury/liquidity-scenario.entity.ts`
- `packages/contracts/src/erp/finance/treasury/liquidity-scenario.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/liquidity-forecast.table.ts`
- `packages/db/src/schema/erp/finance/treasury/liquidity-scenario.table.ts`
- `packages/core/src/erp/finance/treasury/liquidity-forecast.service.ts`
- `packages/core/src/erp/finance/treasury/liquidity-forecast.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/liquidity-forecast.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/liquidity-forecast.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-liquidity-forecast-requested.ts`
- `apps/web/src/app/(erp)/finance/treasury/liquidity-forecast/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/liquidity-forecast-report.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_liquidity_forecast.sql`

### Wave 4 manifest: in-house banking and intercompany settlement

#### Sprint 4.1 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/internal-bank-account.entity.ts`
- `packages/contracts/src/erp/finance/treasury/internal-bank-account.commands.ts`
- `packages/contracts/src/erp/finance/treasury/intercompany-transfer.entity.ts`
- `packages/contracts/src/erp/finance/treasury/intercompany-transfer.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/internal-bank-account.table.ts`
- `packages/db/src/schema/erp/finance/treasury/intercompany-transfer.table.ts`
- `packages/core/src/erp/finance/treasury/intercompany-transfer.service.ts`
- `packages/core/src/erp/finance/treasury/intercompany-transfer.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/intercompany-balancing.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/intercompany-transfer.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-intercompany-transfer-settled.ts`
- `apps/web/src/app/(erp)/finance/treasury/inhouse-bank/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/intercompany-transfer-board.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_intercompany_transfer.sql`

#### Sprint 4.2 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/netting-session.entity.ts`
- `packages/contracts/src/erp/finance/treasury/netting-session.commands.ts`
- `packages/contracts/src/erp/finance/treasury/internal-interest-rate.entity.ts`
- `packages/contracts/src/erp/finance/treasury/internal-interest-rate.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/netting-session.table.ts`
- `packages/db/src/schema/erp/finance/treasury/internal-interest-rate.table.ts`
- `packages/core/src/erp/finance/treasury/netting-session.service.ts`
- `packages/core/src/erp/finance/treasury/netting-session.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/internal-interest.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/netting-session.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-netting-session-closed.ts`
- `apps/web/src/app/(erp)/finance/treasury/netting/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/netting-settlement-view.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_netting_interest.sql`

### Wave 5 manifest: risk, FX, and treasury accounting integration

#### Sprint 5.1 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/fx-exposure.entity.ts`
- `packages/contracts/src/erp/finance/treasury/fx-exposure.commands.ts`
- `packages/contracts/src/erp/finance/treasury/hedge-designation.entity.ts`
- `packages/contracts/src/erp/finance/treasury/hedge-designation.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/fx-exposure.table.ts`
- `packages/db/src/schema/erp/finance/treasury/hedge-designation.table.ts`
- `packages/core/src/erp/finance/treasury/fx-exposure.service.ts`
- `packages/core/src/erp/finance/treasury/fx-exposure.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/fx-revaluation.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/fx-exposure.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-fx-revaluation-requested.ts`
- `apps/web/src/app/(erp)/finance/treasury/fx/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/fx-exposure-grid.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_fx_exposure.sql`

#### Sprint 5.2 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/treasury-accounting-policy.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-accounting-policy.commands.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-posting-bridge.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-posting-bridge.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/treasury-accounting-policy.table.ts`
- `packages/db/src/schema/erp/finance/treasury/treasury-posting-bridge.table.ts`
- `packages/core/src/erp/finance/treasury/treasury-accounting-bridge.service.ts`
- `packages/core/src/erp/finance/treasury/treasury-accounting-bridge.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/treasury-accounting-posting.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-accounting-bridge.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-treasury-posting-requested.ts`
- `apps/web/src/app/(erp)/finance/treasury/accounting/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/treasury-gl-reconciliation.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_accounting_bridge.sql`

### Wave 6 manifest: governance, compliance, and external connectivity

#### Sprint 6.1 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/treasury-policy.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-policy.commands.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-limit.entity.ts`
- `packages/contracts/src/erp/finance/treasury/treasury-limit.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/treasury-policy.table.ts`
- `packages/db/src/schema/erp/finance/treasury/treasury-limit.table.ts`
- `packages/core/src/erp/finance/treasury/treasury-policy.service.ts`
- `packages/core/src/erp/finance/treasury/treasury-policy.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/limit-breach.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/treasury-policy.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-treasury-limit-breached.ts`
- `apps/web/src/app/(erp)/finance/treasury/governance/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/treasury-policy-console.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_policy_limit.sql`

#### Sprint 6.2 files to create or update

Create:

- `packages/contracts/src/erp/finance/treasury/bank-connector.entity.ts`
- `packages/contracts/src/erp/finance/treasury/bank-connector.commands.ts`
- `packages/contracts/src/erp/finance/treasury/market-data-feed.entity.ts`
- `packages/contracts/src/erp/finance/treasury/market-data-feed.commands.ts`
- `packages/db/src/schema/erp/finance/treasury/bank-connector.table.ts`
- `packages/db/src/schema/erp/finance/treasury/market-data-feed.table.ts`
- `packages/core/src/erp/finance/treasury/bank-connector.service.ts`
- `packages/core/src/erp/finance/treasury/bank-connector.queries.ts`
- `packages/core/src/erp/finance/treasury/calculators/connector-health.ts`
- `packages/core/src/erp/finance/treasury/__vitest_test__/bank-connector.service.test.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-bank-connector-sync-requested.ts`
- `apps/worker/src/jobs/erp/finance/treasury/handle-market-data-refresh-requested.ts`
- `apps/web/src/app/(erp)/finance/treasury/integrations/page.tsx`
- `apps/web/src/app/(erp)/finance/treasury/components/connector-monitor.tsx`

Update:

- `packages/contracts/src/erp/finance/treasury/index.ts`
- `packages/db/src/schema/erp/finance/treasury/index.ts`
- `packages/core/src/erp/finance/treasury/calculators/index.ts`
- `packages/core/src/erp/finance/treasury/index.ts`
- `apps/api/src/routes/erp/finance/treasury.ts`
- `apps/worker/src/jobs/erp/finance/treasury/index.ts`
- `tools/gates/contract-db-sync.mjs`
- `packages/db/drizzle/<timestamp>_treasury_connectors_market_data.sql`

## Wave 0: Foundation and guardrails

### Outcome

Create Treasury baseline scaffolding and enforce AP-grade patterns before feature growth.

### Sprint 0.1: Domain skeleton and governance

Scope:

1. Create Treasury paths across all layers:
   1. `packages/contracts/src/erp/finance/treasury/`
   2. `packages/db/src/schema/erp/finance/treasury/`
   3. `packages/core/src/erp/finance/treasury/`
   4. `apps/api/src/routes/erp/finance/treasury.ts`
   5. `apps/worker/src/jobs/erp/finance/treasury/`
   6. `apps/web/src/app/(erp)/finance/treasury/`
2. Register Treasury error/action/permission placeholders
3. Add OWNERS and barrel exports

Exit criteria:

1. `pnpm typecheck` passes
2. `pnpm check:all` passes
3. No import-direction violations

### Sprint 0.2: Shared Treasury primitives

Scope:

1. Define base enums and shared contract primitives:
   1. status lifecycles
   2. cash movement directions
   3. reconciliation states
2. Define common service Result types and payload metadata shape
3. Add Treasury test builder utilities in `__vitest_test__/`

Exit criteria:

1. Shared primitives used by first entities
2. Unit tests cover common invariants

## Wave 1: Cash visibility and bank data intake

### Outcome

Deliver real-time cash visibility and reliable bank statement ingestion.

### Sprint 1.1: Bank account management

Vertical slice:

1. Contracts:
   1. `bank-account.entity.ts`
   2. `bank-account.commands.ts`
2. DB:
   1. `bank_account` table with org scope, currency, status, external bank refs
   2. indexes on org, account number, bank id
3. Core:
   1. create/update/activate/deactivate services
   2. state transition guards
   3. outbox events for lifecycle changes
4. API:
   1. command routes
   2. list/detail query routes
5. UI:
   1. account list
   2. create/edit flow
   3. active/inactive action controls
6. Tests:
   1. guard + success + outbox assertions

Exit criteria:

1. End-to-end CRUD and lifecycle actions working
2. No cross-org access

### Sprint 1.2: Bank statement and statement line ingestion

Vertical slice:

1. Contracts for `bank-statement` and `bank-statement-line`
2. DB tables for statement header and append-only lines
3. Core ingestion service with idempotency and duplicate detection
4. API endpoints for upload/ingest/list/detail
5. Worker job for asynchronous parsing/enrichment
6. UI statement monitor and ingestion errors panel

Exit criteria:

1. Same file cannot be ingested twice with same idempotency key
2. Statement line append-only behavior enforced
3. Ingestion audit logs and outbox events verified

## Wave 2: Reconciliation and payment controls

### Outcome

Enable deterministic reconciliation and payment process governance.

### Sprint 2.1: Reconciliation session

Vertical slice:

1. `reconciliation-session` entity and commands (open/match/unmatch/close)
2. Matching engine core service with amount and tolerance checks
3. Query endpoints for unmatched/matched buckets
4. UI reconciliation workbench
5. Worker for auto-match suggestions

Exit criteria:

1. Matched sum cannot exceed statement line amount
2. Closed session blocks further mutation

### Sprint 2.2: Payment factory baseline

Vertical slice:

1. `treasury-payment-batch` and `treasury-payment-instruction`
2. approval workflow with SoD checks
3. payment release events for downstream execution adapters
4. UI approval queue and exception management

Exit criteria:

1. Maker-checker enforced
2. Payment status transitions are legal and auditable

## Wave 3: Liquidity planning and cash positioning

### Outcome

Deliver forecasting and cash position snapshots integrated with AP/AR flows.

### Sprint 3.1: Cash position snapshot

Vertical slice:

1. snapshot model from bank balances + pending flows
2. worker-generated periodic snapshots
3. API and UI for as-of position dashboards

Exit criteria:

1. Snapshot reproducibility validated from source events
2. org-level and currency-level rollups consistent

### Sprint 3.2: Liquidity forecast baseline

Vertical slice:

1. forecast assumptions and scenario model entities
2. short and medium horizon forecast services
3. forecast variance reporting UI

Exit criteria:

1. Forecast run is traceable to assumptions and input version
2. Forecast outputs reproducible for same inputs

## Wave 4: In-house banking and intercompany settlement

### Outcome

Support enterprise internal banking flows.

### Sprint 4.1: Internal accounts and transfers

Vertical slice:

1. internal treasury account structures
2. intercompany transfer lifecycle
3. balancing controls and internal settlement events

Exit criteria:

1. Every transfer has balanced debit/credit legs
2. Intercompany org controls and approvals enforced

### Sprint 4.2: Netting and internal interest

Vertical slice:

1. netting session entities
2. internal interest calculation services
3. settlement posting integration with treasury accounting

Exit criteria:

1. Netting outputs reconcile with source obligations
2. interest computation deterministic and tested

## Wave 5: Risk, FX, and treasury accounting integration

### Outcome

Introduce risk and valuation capabilities with accounting-grade traceability.

### Sprint 5.1: FX exposure and hedge baseline

Vertical slice:

1. exposure capture entities
2. hedge designation commands
3. revaluation event pipeline

Exit criteria:

1. Exposure calculations reproducible from source transactions
2. hedge lifecycle controls enforce legal states

### Sprint 5.2: Treasury accounting bridge

Vertical slice:

1. posting bridge events from treasury operations to GL
2. accounting policy mapping tables
3. reconciliation views between treasury and GL

Exit criteria:

1. Every posting event linked to treasury source entity
2. reconciliation report has zero orphan postings

## Wave 6: Governance, compliance, and external connectivity

### Outcome

Operationalize policy controls and enterprise integrations.

### Sprint 6.1: Treasury policy and limits

Vertical slice:

1. policy and limit definition entities
2. real-time limit checks in services
3. breach events and approval override flow

Exit criteria:

1. policy violations block forbidden transitions
2. all overrides audited with correlation IDs

### Sprint 6.2: Bank and market integration adapters

Vertical slice:

1. connector abstractions for SWIFT/EBICS/host-to-host
2. market data ingestion framework
3. adapter execution monitoring UI

Exit criteria:

1. connector failures are retriable and observable
2. inbound/outbound integration events traced end to end

## Standard sprint checklist (apply every sprint)

1. Contracts first:
   1. entities
   2. commands with `idempotencyKey`
2. DB next:
   1. table
   2. migration
   3. contract-db sync registration
3. Core services:
   1. guard-first logic
   2. `withAudit(...)`
   3. outbox event in same transaction
4. API routes:
   1. thin handlers
   2. no direct db imports
5. Worker handlers:
   1. outbox consumer
   2. side effects
6. UI pages:
   1. list/detail/action flows
   2. loading/error states
7. Tests:
   1. guard cases
   2. success path
   3. outbox payload assertions
8. Verification:
   1. `pnpm typecheck`
   2. targeted tests
   3. `pnpm check:all`

## Anti-patterns to block early

1. Money stored as float or number in persistence
2. Missing org filter in query or update paths
3. Command schema without idempotency key
4. Mutation without audit entry and outbox event
5. API route talking directly to db
6. Unbounded status transitions
7. Missing tests for outbox payload fields
8. Co-located tests outside `__vitest_test__/`

## Suggested sequencing strategy

1. Deliver Wave 1 and Wave 2 first for immediate operational value
2. Parallelize Wave 3 planning while hardening reconciliation
3. Start Wave 5 only after accounting bridge contracts are approved
4. Keep Wave 6 integrations behind adapter boundaries to isolate vendor complexity

## Reporting template per sprint

Use this status format each sprint review:

1. Scope completed
2. Open risks
3. Gate results
4. Outbox events added
5. Audit actions added
6. Error codes added
7. Deferred items and rationale
