/**
 * Barrel — shared/ (universal primitives with zero business ownership)
 *
 * ADR-0005 §3.3: shared/ is brutally narrow. Only context-free primitives here.
 *
 * TODO: Split errors.ts → shared/result.ts + module-local error codes
 * TODO: Split permissions.ts → kernel + module-local permissions
 */
// Primitive schemas — these stay in shared/
export * from "./ids.js";
export {
  SystemClock,
  FixedClock,
  getClock,
  setClock,
  withClock,
  now,
  nowUtc as clockNowUtc,
  nowMs,
  withFixedClock,
  SharedClock,
} from "./clock.js";
export * from "./datetime.js";
export * from "./money.js";
export {
  dbBigintToBigInt,
  bigIntToDbBigint,
  moneyJsonReplacer,
  jsonReplacer,
  moneyJsonReviver,
  jsonReviver,
  eventJsonReplacer,
  stringifyWithMoney,
  parseWithMoney,
  stringifyEventPayload,
  eventSerialize,
  MoneyTransport,
} from "./money-transport.js";
export * from "./money-utils.js";
export * from "./currency.js";
export * from "./journal.js";
export {
  ensureIdempotency,
  createInMemoryIdempotencyStore,
  SharedIdempotency,
  type IdempotencyStore,
  type IdempotencyState,
  IdempotencyKeySchema as SharedIdempotencyKeySchema,
  type IdempotencyKey as SharedIdempotencyKey,
} from "./idempotency.js";
export {
  upsertById,
  insertIfNotExists,
  applyIfNotSeen,
  createPostgresProcessedEntriesStore,
  createRedisIdempotencyStore,
  IdempotentWrites,
  type SqlClient,
  type QueryResult,
  type QueryResultRow,
  type PostgresProcessedEntriesStoreOptions,
  type RedisLikeClient,
  type RedisIdempotencyStoreOptions,
} from "./idempotent-writes.js";
export * from "./commands.js";
export * from "./pagination.js";
export * from "./search.js";
export * from "./queries.js";
export * from "./events.js";
export {
  Limits,
  PostgresIdempotencyStore,
  InMemoryIdempotencyStore,
  ensureIdempotency as ensureIdempotencyWithFailureState,
  BulkIdsSchema,
  EventEnvelopeSchema as MinimalEventEnvelopeSchema,
  SharedConventions,
  type IdempotencyEntry as ConventionsIdempotencyEntry,
  type IdempotencyStore as ConventionsIdempotencyStore,
  type IdempotencyKey as ConventionsIdempotencyKey,
  type BulkIds,
  type EventEnvelope as MinimalEventEnvelope,
  type SqlClient as ConventionsSqlClient,
} from "./conventions.js";
export * from "./schema-versioning.js";
export {
  appendAudit,
  createAuditLogEntry,
  redactAuditSnapshots,
  SharedAudit,
  AuditFieldsSchema as SharedAuditFieldsSchema,
  AuditFieldsInputSchema as SharedAuditFieldsInputSchema,
  AuditLogEntrySchema as SharedAuditLogEntrySchema,
  AuditActorTypeSchema,
  AuditChannelSchema,
  type AuditFields as SharedAuditFields,
  type AuditFieldsInput as SharedAuditFieldsInput,
  type AuditLogEntry as SharedAuditLogEntry,
  type AuditRedactionRule,
} from "./audit.js";
export {
  bigintColumnMigrationTemplate,
  partitionStrategyFor,
  recommendedIndexes,
  backfillPlan,
  validateBackfillStep,
  compareSnapshots,
  optimisticLockColumn,
  withAdvisoryLock,
  backfillValidator,
  MigrationSqlSnippets,
  SharedDbMigration,
  datePartitionColumnDefinition as migrationDatePartitionColumnDefinition,
  type PartitionCadence,
  type PartitionStrategy,
  type RecommendedIndex,
  type BackfillPlanStep,
  type SnapshotShape,
  type AdvisoryLockClient,
  type BackfillValidationRow,
  type BackfillValidationResult,
} from "./db-migration.js";
export {
  datePartitionColumnDefinition as dbDatePartitionColumnDefinition,
  bigintColumnMigrationTemplate as dbBigintColumnMigrationTemplate,
  backfillValidator as dbBackfillValidator,
  MigrationHelpers,
  type BackfillValidatorOptions as DbBackfillValidatorOptions,
  type QueryablePool,
} from "./migration-helpers.js";
export {
  reconcileTotals,
  findDiscrepancies,
  reconciliationReport,
  computeTotalsFromDb,
  Reconciliation,
  type Currency,
  type AmountMinor,
  type TotalsMap,
  type CurrencyDiff,
  type AccountDiffSample,
  type ReconciliationResult,
  type AccountBalanceSnapshot,
  type QueryablePool as ReconciliationQueryablePool,
} from "./reconciliation.js";
export {
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  attachContextMiddleware,
  ctxLogger,
  ctxClock,
  ctxCorrelationId,
  NoopLogger,
  NoopFeatureClient,
  NoopSecretsProvider,
  SharedRequestContext,
  type RequestContext as SharedRequestContextType,
  type Logger,
  type FeatureClient,
  type SecretsProvider,
  type ContextMiddleware,
} from "./request-context.js";
export * from "./validation.js";
export * from "./headers.js";
export {
  Envelope,
  SuccessEnvelope,
  SuccessEnvelopeSchema,
  CursorEnvelope,
  CursorEnvelopeSchema,
  Envelopes,
  EnvelopeMetaSchema,
  ErrorDetailsSchema,
  ErrorEnvelopeSchema as ContractErrorEnvelopeSchema,
  type EnvelopeMeta,
  type ErrorEnvelope as ContractErrorEnvelope,
  type SuccessEnvelopeType,
  type CursorEnvelopeType,
} from "./envelopes.js";
export {
  createSeededRng,
  deterministicUuid,
  makeMoneyFixture,
  makeDateFixture,
  makeJournalEntryFixture,
  randomMoney,
  randomUtcDate,
  runPropertyHarness,
  seedGenerator,
  sampleLedgerBatch,
  TestFixtures,
  type RNG,
  type MoneyFixtureOptions,
  type DateFixtureOptions,
  type JournalEntryFixtureOptions,
  type MinorRange,
  type UtcDateRange,
  type SeedGeneratorOptions,
  type CurrencySeed,
  type PermissionSeed,
  type CurrencyMetaSeed,
} from "./test-fixtures.js";
export {
  verifySeedMatchesCode,
  schemaCompatibilityCheck,
  Governance,
  type SeedPermissionRow,
} from "./governance.js";

// errors.ts and permissions.ts stay in shared/ for now (splitting deferred)
export * from "./errors.js";
export * from "./permissions.js";

// Composite schemas — depend on ids + errors
export * from "./envelope.js";
