/**
 * Evidence / document entity schemas.
 *
 * RULES:
 *   1. `DocumentSchema` models the stored asset metadata. Object-storage routing
 *      (objectKey, sha256) is infrastructure-sensitive — never log or expose these
 *      fields in error responses; masking belongs in core or the API layer.
 *   2. `EvidenceTargetSchema` is the single source of truth for the discriminated
 *      union of attach targets. Commands import from here, never redefine.
 *   3. `EvidenceLinkSchema` uses `z.intersection` with `EvidenceTargetSchema` to
 *      guarantee the (entityType, entityId) pair is always internally consistent —
 *      e.g. entityType="invoice" can never be paired with a SupplierIdSchema UUID.
 *   4. A single document may be attached to multiple entities (one-to-many).
 *      `EvidenceLinkSchema` models the join row, not the document itself.
 *   5. Adding a new attachment target (new entityType variant) is a BREAKING CHANGE
 *      that ripples through the API route, worker job, DB insert, and audit log.
 *      Coordinate with all OWNERS before adding a variant.
 */
import { z } from "zod";
import {
  DocumentIdSchema,
  EntityIdSchema,
  InvoiceIdSchema,
  JournalEntryIdSchema,
  SupplierIdSchema,
  OrgIdSchema,
  PrincipalIdSchema,
} from "../../../shared/ids.js";
import { IdempotencyKeySchema } from "../../execution/idempotency/request-key.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

/**
 * Lowercase hex SHA-256 — 64 chars, [a-f0-9] only.
 * Exported so RegisterDocumentCommandSchema can reuse without redefining.
 */
export const Sha256Schema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{64}$/, "sha256 must be 64 lowercase hex chars");

/**
 * MIME type string. Format validation (e.g. allowlist) belongs in core.
 * Exported so RegisterDocumentCommandSchema can reuse without redefining.
 */
export const MimeTypeSchema = z.string().trim().min(1).max(255);

/**
 * Document / evidence file metadata (the stored asset).
 *
 * Rule: JSON-safe only — no Date instances, no secrets.
 * objectKey and sha256 are infrastructure-sensitive; never log or expose
 * them in error responses (masking belongs in core or the API layer).
 *
 * Evidence attachment links (document ↔ invoice/supplier/journal) should
 * be modeled separately as EvidenceLinkSchema when the attachment audit
 * trail requires its own fields (attachedAt, attachedByUserId, label).
 */
export const DocumentSchema = z.object({
  id: DocumentIdSchema,
  orgId: OrgIdSchema,

  objectKey: z.string().trim().min(1).max(1024),
  sha256: Sha256Schema,
  mime: MimeTypeSchema,

  // JS safe integer covers all real-world file sizes (up to ~8 PB).
  // Must be positive — zero-byte documents are rejected at the boundary.
  sizeBytes: z.number().int().positive().safe(),

  uploadedAt: UtcDateTimeSchema,

  // Optional — set when the upload originates from an authenticated principal.
  // Null for system-generated or migrated documents.
  uploadedByPrincipalId: PrincipalIdSchema.nullable().optional(),

  // Optional — the client-provided filename; not used for storage routing.
  originalFileName: z.string().trim().min(1).max(255).optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

// ─── Typed attachment target (discriminated union) ───────────────────────────
//
// Single source of truth for valid (entityType, entityId) pairs.
// Using a discriminated union guarantees that entityType="invoice" can only
// ever be paired with an InvoiceId — mismatched pairs are rejected at parse time.
//
// Commands import this schema from here; they must never redefine it.
//
// GOVERNANCE: adding a new variant ripples through the API route, worker job,
// DB insert, and audit log. Coordinate with all OWNERS before adding a variant.
export const EvidenceTargetSchema = z.discriminatedUnion("entityType", [
  z.object({ entityType: z.literal("invoice"), entityId: InvoiceIdSchema }),
  z.object({ entityType: z.literal("journalEntry"), entityId: JournalEntryIdSchema }),
  z.object({ entityType: z.literal("supplier"), entityId: SupplierIdSchema }),
]);

export type EvidenceTarget = z.infer<typeof EvidenceTargetSchema>;

// ─── Evidence link (the join row) ─────────────────────────────────────────────

/**
 * Evidence link — the polymorphic join between a Document and a domain entity.
 *
 * Models the `evidence` DB table (one row per document-entity attachment).
 * Kept separate from DocumentSchema because a single document can be attached
 * to multiple entities (one-to-many).
 *
 * Uses `z.intersection` with `EvidenceTargetSchema` so the (entityType, entityId)
 * pair is always internally consistent — the discriminated union is enforced at
 * parse time, not just at the TypeScript level.
 */
export const EvidenceLinkSchema = z.intersection(
  z.object({
    id: EntityIdSchema, // PK of the evidence join row (not a document ID)
    orgId: OrgIdSchema,
    documentId: DocumentIdSchema,

    label: z.string().trim().min(1).max(64).nullable(),
    attachedAt: UtcDateTimeSchema,
    attachedByPrincipalId: PrincipalIdSchema.nullable(),
    idempotencyKey: IdempotencyKeySchema.optional(),
  }),
  EvidenceTargetSchema,
);

export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;
