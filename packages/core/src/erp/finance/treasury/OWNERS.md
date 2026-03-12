# Treasury Core — OWNERS

## Module: `packages/core/src/erp/finance/treasury`

Pillar: `erp` | Domain: `finance/treasury`

## Exports

| File | Exports |
|------|---------|
| `index.ts` | Re-exports all Treasury service functions and query helpers |
| `bank-account.service.ts` | `createBankAccount`, `updateBankAccount`, `activateBankAccount`, `deactivateBankAccount` |
| `bank-account.queries.ts` | `listBankAccounts`, `getBankAccountById` |
| `bank-statement.service.ts` | `ingestBankStatement`, `markStatementFailed` |
| `bank-statement.queries.ts` | `listBankStatements`, `getBankStatementById`, `listBankStatementLines` |
| `reconciliation-session.service.ts` | `openReconciliationSession`, `addReconciliationMatch`, `removeReconciliationMatch`, `closeReconciliationSession` |
| `reconciliation-session.queries.ts` | `listReconciliationSessions`, `getReconciliationSessionById`, `listReconciliationMatches` |
| `treasury-payment-instruction.service.ts` | `createPaymentInstruction`, `submitPaymentInstruction`, `approvePaymentInstruction`, `rejectPaymentInstruction` |
| `treasury-payment-instruction.queries.ts` | `listPaymentInstructions`, `getPaymentInstructionById` |
| `treasury-payment-batch.service.ts` | `createPaymentBatch`, `requestPaymentBatchRelease`, `releasePaymentBatch` |
| `treasury-payment-batch.queries.ts` | `listPaymentBatches`, `getPaymentBatchById`, `listPaymentBatchItems` |
| `cash-position-snapshot.service.ts` | `requestCashPositionSnapshot`, `supersedeCashPositionSnapshot` |
| `cash-position-snapshot.queries.ts` | `listCashPositionSnapshots`, `getCashPositionSnapshotById`, `listCashPositionSnapshotLines` |
| `liquidity-forecast.service.ts` | `createLiquidityScenario`, `activateLiquidityScenario`, `requestLiquidityForecast` |
| `liquidity-forecast.queries.ts` | `listLiquidityScenarios`, `listLiquidityForecasts`, `getLiquidityForecastById`, `listLiquidityForecastBuckets` |
| `liquidity-source-feed.service.ts` | `upsertLiquiditySourceFeed` |
| `liquidity-source-feed.queries.ts` | `listLiquiditySourceFeeds` |
| `fx-normalization.service.ts` | `normalizeToBase` |
| `fx-rate-snapshot.service.ts` | `upsertFxRateSnapshot` |
| `fx-rate-snapshot.queries.ts` | `listFxRateSnapshots` |
| `lineage.queries.ts` | `listCashPositionSnapshotLineage`, `listLiquidityForecastBucketLineage` |
| `forecast-variance.service.ts` | `recordForecastVariance` |
| `forecast-variance.queries.ts` | `listForecastVarianceByForecastId`, `getForecastVarianceById` |
| `ap-due-payment-projection.service.ts` | `upsertApDuePaymentProjection` |
| `ap-due-payment-projection.queries.ts` | `listApDuePaymentProjections` |
| `ar-expected-receipt-projection.service.ts` | `upsertArExpectedReceiptProjection` |
| `ar-expected-receipt-projection.queries.ts` | `listArExpectedReceiptProjections` |

## Planned files (added per sprint)

| Sprint | File | Purpose |
|--------|------|---------|
| 0.2 | `__vitest_test__/treasury-test-builders.ts` | Test fixtures and builder helpers |
| 1.1 | `bank-account.service.ts` | Create/update/activate/deactivate bank accounts |
| 1.1 | `bank-account.queries.ts` | List and detail queries |
| 1.2 | `bank-statement.service.ts` | Ingestion with idempotency and duplicate detection |
| 1.2 | `bank-statement.queries.ts` | Statement list and line queries |
| 2.1 | `reconciliation-session.service.ts` | Open/match/unmatch/close lifecycle |
| 2.1 | `reconciliation-session.queries.ts` | Unmatched and matched bucket queries |
| 2.2 | `treasury-payment-batch.service.ts` | Batch creation, approval, release |
| 2.2 | `treasury-payment-batch.queries.ts` | Batch and instruction queries |
| 3.1 | `cash-position-snapshot.service.ts` | Snapshot request/calculation/supersede lifecycle |
| 3.1 | `cash-position-snapshot.queries.ts` | Snapshot list/detail/line queries |
| 3.2 | `liquidity-forecast.service.ts` | Scenario create/activate and forecast calculation |
| 3.2 | `liquidity-forecast.queries.ts` | Scenario list, forecast list/detail, bucket list |
| 3.2+ | `liquidity-source-feed.service.ts` | Upsert external liquidity source feed rows |
| 3.2+ | `liquidity-source-feed.queries.ts` | List source feed rows by status/date |
| 3.3+ | `lineage.queries.ts` | Persistent lineage queries for snapshot lines and forecast buckets |
| 3.3 | `forecast-variance.service.ts` | Backtesting variance record workflow |
| 3.3 | `forecast-variance.queries.ts` | Variance list/detail queries |
| 2.2+ | `calculators/` | Domain calculators (matching, routing, balancing) |

## Invariants

- All services accept `db: Db` and `ctx: OrgScopedContext & PolicyContext`.
- All mutations emit an outbox event and write an audit log in the same transaction.
- All commands are idempotent via `idempotencyKey`.
- No `new Date()` — use `sql\`now()\`` for DB timestamps.
- No direct `@afenda/db` import in service bodies — use the `db` parameter passed in.
