# Treasury Contracts — OWNERS

## Module: `packages/contracts/src/erp/finance/treasury`

Pillar: `erp` | Domain: `finance/treasury`

## Import Rules

| May import | Must NOT import |
| ---------- | --------------- |
| `@afenda/contracts` (shared primitives) | `@afenda/ui` |
| `zod` | `@afenda/db` |
| | `@afenda/core` |
| | Other monorepo packages |

## Files

| Sprint | File | Exports | Description |
|--------|------|---------|-------------|
| 0.2 | `treasury-shared.entity.ts` | Status enums and lifecycle vocabularies | Common Treasury primitives |
| 0.2 | `treasury-shared.commands.ts` | `TreasuryBaseCommandSchema`, `TreasuryBaseCommand` | Base command with `idempotencyKey` |
| 1.1 | `bank-account.entity.ts` | `BankAccountSchema`, `BankAccountStatusValues` | Bank account schema + status |
| 1.1 | `bank-account.commands.ts` | `CreateBankAccountCommandSchema`, … | Create/update/activate/deactivate commands |
| 1.2 | `bank-statement.entity.ts` | `BankStatementSchema`, `BankStatementStatusValues` | Bank statement header schema |
| 1.2 | `bank-statement.commands.ts` | `IngestBankStatementCommandSchema` | Ingest/list commands |
| 1.2 | `bank-statement-line.entity.ts` | `BankStatementLineSchema` | Statement line (append-only) |
| 1.2 | `bank-statement-line.commands.ts` | — | Line reconciliation helpers |
| 2.1 | `reconciliation-session.entity.ts` | `ReconciliationSessionSchema` | Reconciliation session lifecycle |
| 2.1 | `reconciliation-session.commands.ts` | `OpenReconciliationSessionCommandSchema`, … | Open/match/unmatch/close |
| 2.2 | `treasury-payment-batch.entity.ts` | `PaymentBatchSchema`, `PaymentBatchStatusValues` | Payment batch + approval |
| 2.2 | `treasury-payment-batch.commands.ts` | `CreatePaymentBatchCommandSchema`, … | Create/approve/release |
| 2.2 | `treasury-payment-instruction.entity.ts` | `PaymentInstructionSchema` | Individual payment instruction |
| 2.2 | `treasury-payment-instruction.commands.ts` | — | Payment instruction commands |
| 3.1 | `cash-position-snapshot.entity.ts` | `CashPositionSnapshotSchema`, `CashPositionSnapshotLineSchema`, statuses/types | Snapshot contract + line attribution |
| 3.1 | `cash-position-snapshot.commands.ts` | `RequestCashPositionSnapshotCommandSchema` | Snapshot request command |
| 3.2 | `liquidity-scenario.entity.ts` | `LiquidityScenarioSchema`, scenario statuses/types | Liquidity scenario modeling |
| 3.2 | `liquidity-scenario.commands.ts` | `CreateLiquidityScenarioCommandSchema`, `ActivateLiquidityScenarioCommandSchema` | Scenario create/activate commands |
| 3.2 | `liquidity-forecast.entity.ts` | `LiquidityForecastSchema`, `LiquidityForecastBucketSchema` | Forecast aggregate + bucket contracts |
| 3.2 | `liquidity-forecast.commands.ts` | `RequestLiquidityForecastCommandSchema` | Forecast request command |
| 3.2+ | `liquidity-source-feed.entity.ts` | `LiquiditySourceFeedSchema` | AP/AR/manual projection feed contract |
| 3.2+ | `liquidity-source-feed.commands.ts` | `UpsertLiquiditySourceFeedCommandSchema` | Feed upsert command |
| 3.3 | `forecast-variance.entity.ts` | `ForecastVarianceSchema` | Forecast vs actual variance records |
| 3.3 | `forecast-variance.commands.ts` | `RecordForecastVarianceCommandSchema` | Record measured variance for a forecast bucket |

## Invariants

- All money fields: `bigint` minor units (cents). No floats.
- All ID fields: `z.string().uuid()`.
- All commands include `idempotencyKey: z.string().uuid()`.
- All entities include `orgId`, `createdAt`, `updatedAt`.

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Error codes added to `contracts/shared/errors.ts` if new failures introduced
- [ ] Audit actions added to `contracts/kernel/governance/audit/actions.ts` if new auditable events
- [ ] Outbox events documented in `contracts/kernel/execution/outbox/envelope.ts` if new async events

