/**
 * @afenda/contracts root barrel — re-exports only.
 *
 * RULES:
 *   1. Consumers MUST import from "@afenda/contracts" (this barrel).
 *      Deep file paths are forbidden.
 *   2. Never put Zod schemas or types directly in this file.
 *   3. Add new exports to the appropriate pillar/module barrel.
 *
 * ADR-0005: Pillar structure — shared / kernel / erp / comm
 */

// ── shared (universal primitives) ────────────────────────────────────────────
export * from "./shared/index.js";

// ── kernel (system truth capabilities) ───────────────────────────────────────
export * from "./kernel/index.js";

// ── erp (business domains) ───────────────────────────────────────────────────
export * from "./erp/index.js";
export { JournalEntrySchema, type JournalEntry } from "./erp/finance/gl/journal-entry.entity.js";

// ── comm (communication surfaces) ────────────────────────────────────────────
export * from "./comm/index.js";

// ── adapters (infrastructure-agnostic contracts) ────────────────────────────
export {
  PostgresRepository,
  InMemoryRepository,
  DbAdapters,
  DomainError as AdapterDomainError,
  type Repository,
  type RepoResult,
  type QueryClient,
  type ListOptions,
} from "./adapters/db.js";
export {
  PostgresSearchAdapter,
  ElasticSearchAdapter,
  InMemorySearchIndex,
  SearchAdapters,
  SearchError,
  type SearchResult as AdapterSearchResult,
  type SearchQuery as AdapterSearchQuery,
  type SearchIndex as AdapterSearchIndex,
  type PostgresQueryClient,
  type ElasticClientLike,
} from "./adapters/search.js";
export {
  PostgresEventBus,
  RedisEventBus,
  InMemoryEventBus,
  EventBusAdapters,
  EventBusError,
  type EventBus,
  type EventEnvelope as AdapterEventEnvelope,
  type PostgresPoolLike,
  type PostgresTxClient,
  type RedisClientLike,
} from "./adapters/event-bus.js";
export {
  InMemoryFileStore,
  LocalFsFileStore,
  S3FileStore,
  StorageAdapters,
  StorageError,
  type FileStore,
  type FileMetadata,
  type PutOptions as FilePutOptions,
  type SignedUrlOptions as FileSignedUrlOptions,
  type ListOptions as FileListOptions,
  type ListResult as FileListResult,
  type S3ClientLike,
} from "./adapters/storage.js";

// ── ui (shell architecture types) ────────────────────────────────────────────
// export * from "./ui/index.js"; // TODO: Re-enable after new shell is built
