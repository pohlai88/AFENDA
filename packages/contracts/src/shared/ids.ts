/**
 * Shared ID primitives.
 *
 * RULES:
 *   1. IDs are always UUID strings — never numeric sequences.
 *   2. IDs that appear in only ONE domain must live in that domain's folder,
 *      not here. Escalate to shared only when referenced across 3+ domains
 *      or when the ID is an IAM / infrastructure cross-cut.
 *   3. Use `brandedUuid(brand)` to create new branded schemas consistently
 *      (import from the contracts package root, not from this file directly):
 *        export const WidgetIdSchema = brandedUuid('WidgetId');
 *   4. Single-domain IDs added here require a comment: why they are cross-cut.
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "./idempotency.js";

/**
 * Private base — single unbranded UUID source of truth.
 * All schemas here derive from this one call so a future format change
 * (e.g. UUID v7) only needs to be made in one place.
 */
const uuid = z.string().uuid();

// ─── Generic primitives ───────────────────────────────────────────────────────

/** Un-branded UUID — use only when the entity type is genuinely unknown. */
export const UuidSchema = uuid;
export type Uuid = z.infer<typeof UuidSchema>;

/** Generic entity reference when the specific type isn't statically known. */
export const EntityIdSchema = uuid.brand<"EntityId">();
export type EntityId = z.infer<typeof EntityIdSchema>;

/**
 * Factory for branded UUID schemas — use this in domain folders so all IDs
 * are validated identically and the branding is consistent.
 *
 * Usage in a domain folder (e.g. invoice/invoice.entity.ts):
 *   import { brandedUuid } from the contracts package root
 *   export const InvoiceIdSchema = brandedUuid("InvoiceId");
 */
export const brandedUuid = <B extends string>(_brand: B) => uuid.brand<B>();

/** Generate a UUID v4 string, preferring the platform implementation. */
export function generateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const randomNibble = Math.floor(Math.random() * 16);
    const value = character === "x" ? randomNibble : (randomNibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Boolean UUID guard for request parsing and adapter boundaries. */
export function isUuid(value: unknown): value is Uuid {
  return UuidSchema.safeParse(value).success;
}

/** Parse and validate a UUID string; throws ZodError on invalid input. */
export function parseUuid(value: unknown): Uuid {
  return UuidSchema.parse(value);
}

/** Parse helpers keep cross-cut ID validation call sites terse and consistent. */
export function parseOrgId(value: unknown): OrgId {
  return OrgIdSchema.parse(value);
}

export function parsePrincipalId(value: unknown): PrincipalId {
  return PrincipalIdSchema.parse(value);
}

export function parseEntityId(value: unknown): EntityId {
  return EntityIdSchema.parse(value);
}

export function parseIdempotencyKey(value: unknown): z.infer<typeof IdempotencyKeySchema> {
  return IdempotencyKeySchema.parse(value);
}

/** Create a validated branded UUID using the target schema as the runtime guard. */
export function createBrandedId<T extends string>(schema: z.ZodType<T>): T {
  return schema.parse(generateUuid());
}

// ─── Tracing — used by headers, envelopes, outbox, audit ─────────────────────

/**
 * UUID that ties a request across API, worker, and logs.
 * Branded so it cannot be confused with an entity ID at the type level.
 */
export const CorrelationIdSchema = uuid.brand<"CorrelationId">();
export type CorrelationId = z.infer<typeof CorrelationIdSchema>;

// ─── IAM — infrastructure cross-cuts (every domain references these) ─────────

// ─── Party Model (ADR-0003) ──────────────────────────────────────────────────

/** Organization — legal entity (company, franchise, counterparty). Replaces TenantId. */
export const OrgIdSchema = uuid.brand<"OrgId">();
export type OrgId = z.infer<typeof OrgIdSchema>;

/** Party — either a person or organization. Base abstraction for legal entities. */
export const PartyIdSchema = uuid.brand<"PartyId">();
export type PartyId = z.infer<typeof PartyIdSchema>;

/** Person — human being (stable, survives across logins/merges). */
export const PersonIdSchema = uuid.brand<"PersonId">();
export type PersonId = z.infer<typeof PersonIdSchema>;

/** Principal — authenticated actor (user account or service account). Token.sub uses this. */
export const PrincipalIdSchema = uuid.brand<"PrincipalId">();
export type PrincipalId = z.infer<typeof PrincipalIdSchema>;

/** PartyRole — "party X plays role Y in org Z" — the hat. */
export const PartyRoleIdSchema = uuid.brand<"PartyRoleId">();
export type PartyRoleId = z.infer<typeof PartyRoleIdSchema>;

// ─── Domain IDs kept in shared because they are referenced across 3+ domains ──

// cross-module comm/tasks identity used by tasks, checklist items, time entries, watchers, and workflow triggers
export const CommTaskIdSchema = uuid.brand<"CommTaskId">();

// cross-module comm/tasks identity used by checklist commands, queries, and audit/event payloads
export const TaskChecklistItemIdSchema = uuid.brand<"TaskChecklistItemId">();

// cross-module comm/tasks identity used by time entry commands, queries, and summaries
export const TaskTimeEntryIdSchema = uuid.brand<"TaskTimeEntryId">();

// cross-module comm/tasks identity used by watcher commands, queries, and notification flows
export const TaskWatcherIdSchema = uuid.brand<"TaskWatcherId">();

// cross-module comm/workflows identity used by workflow commands, queries, runs, and execution records
export const CommWorkflowIdSchema = uuid.brand<"CommWorkflowId">();
export type CommWorkflowId = z.infer<typeof CommWorkflowIdSchema>;

// cross-module comm/workflows run identity used by workflow queries and execution state surfaces
export const CommWorkflowRunIdSchema = uuid.brand<"CommWorkflowRunId">();
export type CommWorkflowRunId = z.infer<typeof CommWorkflowRunIdSchema>;

// cross-domain: referenced by invoice, gl (journal lines), evidence, audit
export const InvoiceIdSchema = uuid.brand<"InvoiceId">();
export type InvoiceId = z.infer<typeof InvoiceIdSchema>;

// cross-domain: referenced by invoice (foreign key), gl (memo), evidence (attach target)
export const SupplierIdSchema = uuid.brand<"SupplierId">();
export type SupplierId = z.infer<typeof SupplierIdSchema>;

/**
 * Evidence documents and attachments.
 *
 * cross-domain: referenced by kernel/governance/evidence (evidence attachments),
 * erp/supplier (supplier onboarding documents), erp/finance/ap (invoice evidence).
 *
 * NOTE: This is DIFFERENT from CommDocumentIdSchema (comm/docs module),
 * which represents knowledge base articles and wiki pages.
 * DocumentIdSchema = evidence/attachments across domains.
 * CommDocumentIdSchema = internal knowledge base (single domain).
 */
export const DocumentIdSchema = uuid.brand<"DocumentId">();
export type DocumentId = z.infer<typeof DocumentIdSchema>;

// cross-domain: referenced by gl commands, journal reversal, evidence attach target
export const JournalEntryIdSchema = uuid.brand<"JournalEntryId">();
export type JournalEntryId = z.infer<typeof JournalEntryIdSchema>;

// cross-domain: referenced by gl journal lines and invoice → GL posting
export const AccountIdSchema = uuid.brand<"AccountId">();
export type AccountId = z.infer<typeof AccountIdSchema>;

// cross-domain: referenced by audit service, evidence trails, compliance queries
export const AuditLogIdSchema = uuid.brand<"AuditLogId">();
export type AuditLogId = z.infer<typeof AuditLogIdSchema>;

/**
 * Canonical convenience bundle for runtime-heavy callers.
 * IdempotencyKeySchema is sourced from shared/idempotency.
 */
export const SharedIds = {
  UuidSchema,
  OrgIdSchema,
  PrincipalIdSchema,
  EntityIdSchema,
  CommTaskIdSchema,
  TaskChecklistItemIdSchema,
  TaskTimeEntryIdSchema,
  TaskWatcherIdSchema,
  CommWorkflowIdSchema,
  CommWorkflowRunIdSchema,
  CorrelationIdSchema,
  PartyIdSchema,
  PersonIdSchema,
  PartyRoleIdSchema,
  InvoiceIdSchema,
  SupplierIdSchema,
  DocumentIdSchema,
  JournalEntryIdSchema,
  AccountIdSchema,
  AuditLogIdSchema,
  IdempotencyKeySchema,
  brandedUuid,
  generateUuid,
  isUuid,
  parseUuid,
  parseOrgId,
  parsePrincipalId,
  parseEntityId,
  parseIdempotencyKey,
  createBrandedId,
};

export default SharedIds;
