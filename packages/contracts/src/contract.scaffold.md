
### DB, migration, and operational helpers

- **Partitioning and Indexing guidance**  
  **Exports**: `partitionStrategyFor(table, volumeHint)`, `recommendedIndexes(table, queries)`.  
  **Why**: codify partition cadence (daily/monthly) and index patterns for ledger scale.

- **Backfill and Validation tooling**  
  **Exports**: `backfillPlan(schemaChange)`, `validateBackfillStep(step)`, `compareSnapshots(before, after)`.  
  **Why**: safe migrations require small, testable steps and automated validation.

- **Concurrency and Locking primitives**  
  **Exports**: `optimisticLockColumn()`, `withAdvisoryLock(key, fn)`.  
  **Why**: prevent race conditions in high‑throughput ledger writes and reconciliation jobs.

---

### Testing, CI and governance primitives

- **Property and fuzz test helpers**  
  **Exports**: `randomMoney(minorRange, currency)`, `randomUtcDate(range)`, property test harness.  
  **Why**: surface edge cases in bigint arithmetic and date boundaries.

- **Contract and seed verification**  
  **Exports**: `verifySeedMatchesCode(seedFile, PermissionValues)`, `schemaCompatibilityCheck()`.  
  **Why**: prevents drift between code, DB seeds, and runtime expectations.

- **Lint and precommit checks**  
  **Exports**: small scripts for `no-lowercase-currency`, `no-direct-new-Date`, `no-bigint-literals-in-domain`.  
  **Why**: enforce the rules in OWNERS automatically.

---
