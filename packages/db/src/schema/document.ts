import { pgTable, text, uuid, bigint, index, unique } from "drizzle-orm/pg-core";
import { organization, iamPrincipal } from "./iam.js";
import { tsz, rlsOrg } from "./_helpers.js";

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT + EVIDENCE STORE
// ─────────────────────────────────────────────────────────────────────────────
export const document = pgTable(
  "document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),    // S3/R2 key (max 1024 chars enforced in contracts)
    sha256: text("sha256").notNull(),           // lowercase hex [a-f0-9]{64} — enforced in contracts
    mime: text("mime").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    originalFileName: text("original_file_name"),      // client-provided; not used for storage routing
    uploadedByPrincipalId: uuid("uploaded_by_principal_id").references(() => iamPrincipal.id, { onDelete: "set null" }),
    uploadedAt: tsz("uploaded_at").defaultNow().notNull(),
  },
  (t) => [
    unique("document_org_object_key_uidx").on(t.orgId, t.objectKey),
    index("document_sha256_idx").on(t.orgId, t.sha256),
    rlsOrg,
  ],
);

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // "invoice" | "journalEntry" | "supplier"
    entityId: uuid("entity_id").notNull(),
    documentId: uuid("document_id").notNull().references(() => document.id),
    label: text("label"),
    attachedByPrincipalId: uuid("attached_by_principal_id").references(() => iamPrincipal.id, { onDelete: "set null" }),
    attachedAt: tsz("attached_at").defaultNow().notNull(),
  },
  (t) => [
    index("evidence_entity_idx").on(t.orgId, t.entityType, t.entityId),
    index("evidence_document_idx").on(t.documentId),
    rlsOrg,
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE OPERATION — operation-level idempotency ledger
//
// Guarantees: one operationId → one documentId, forever.
// Prevents duplicate document rows when a client retries with the same
// operationId but a different objectKey (e.g. retry-after-timeout with
// regenerated upload key).
//
// NOT a business entity — pure idempotency/audit ledger. Do not add
// business columns.  ~100 bytes/row; no TTL needed.
// ─────────────────────────────────────────────────────────────────────────────
export const evidenceOperation = pgTable(
  "evidence_operation",
  {
    operationId: text("operation_id").primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").notNull().references(() => document.id),
    createdAt: tsz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("evidence_op_document_idx").on(t.documentId),
    index("evidence_op_org_idx").on(t.orgId),
    rlsOrg,
  ],
);
