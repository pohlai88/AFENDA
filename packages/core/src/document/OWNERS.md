# core/document — OWNERS

> **Package-wide rules (import boundaries, no-Zod, service function shape,
> domain vs infra separation) are inherited from the root
> [`packages/core/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `document/` directory.**

## Purpose

Document & evidence service layer: persist document metadata after S3 upload,
link documents to domain entities as evidence, enforce evidence-domain
policies, and emit canonical audit payloads for every mutation.

**"Evidence" follows ERP/audit terminology — a file attached to prove a claim
(invoice receipt, delivery note, bank statement).**

| ✅ Belongs                                                          | ❌ Never here                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `registerDocument()` — policy-gated, idempotent doc-row persistence | Zod schemas for documents (→ `@afenda/contracts/evidence`)    |
| `attachEvidence()` — link doc to entity with cross-org guard        | S3 presigned-URL generation (→ `apps/api/src/services/s3.ts`) |
| Retention, lifecycle, access-control, legal-hold policy engine      | Virus-scan processing (→ `apps/worker`)                       |
| Canonical audit-event building for every evidence intent            | OCR / classification ML (→ `apps/worker`)                     |
| Cross-org document-hijack prevention                                | DB table DDL (→ `@afenda/db`)                                 |

---

## File Conventions

| Pattern                | Purpose                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `evidence.registry.ts` | Document metadata persistence — policy-gated, idempotent on `(orgId, objectKey)`, optional content-dedup by SHA-256 |
| `evidence.link.ts`     | Polymorphic entity ↔ document linking with cross-org guard                                                         |
| `evidence.policy.ts`   | Pure/deterministic policy engine — retention, access control, lifecycle, legal hold, audit payload building         |
| `*.test.ts`            | Colocated Vitest tests (add when logic is testable without DB)                                                      |
| `index.ts`             | Domain barrel — `export *` from all three modules                                                                   |

---

## Files

### `evidence.registry.ts`

Document metadata persistence after S3 upload. Policy-gated and idempotent.

**Exported types:**

| Export                      | Kind      | Description                                                                                    |
| --------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `RegisterDocumentParams`    | interface | `orgId`, `objectKey`, `sha256`, `mime`, `sizeBytes`, `uploadedByPrincipalId?`                  |
| `RegisterDocumentOptions`   | interface | `dedupBySha256?`, `dedupAlsoMatchMimeAndSize?`                                                 |
| `RegisterDocumentAuth`      | interface | `operationId`, `policyCtx`, `nowUtc`, `justificationText?`, `mfaVerified?`, `approvalGrantId?` |
| `RegisterDocumentResult`    | interface | `id`, `created`, `deduped`, `idempotentHit`                                                    |
| `RegisterDocumentWithAudit` | interface | `result` + `auditEvent` (canonical payload — caller persists)                                  |
| `RegisterDocumentErrorCode` | type      | `"INVALID_INPUT" \| "DB_READ_FAILED" \| "DB_WRITE_FAILED" \| "DB_READ_AFTER_CONFLICT_FAILED"`  |
| `RegisterDocumentError`     | class     | Typed error with `code` + optional `details`                                                   |
| `EvidencePolicyError`       | re-export | Re-exported from `evidence.policy.ts` for caller convenience                                   |

**Exported functions:**

| Function                | Signature                     | Returns                                             |
| ----------------------- | ----------------------------- | --------------------------------------------------- |
| `registerDocument`      | `(db, params, options, auth)` | `Promise<RegisterDocumentWithAudit>`                |
| `getDocumentIdBySha256` | `(db, orgId, sha256)`         | `Promise<string \| null>` — pre-flight dedup helper |

**Behaviour:**

1. **Input validation** — hard assertions on `objectKey` (non-empty, no traversal), `sha256` (64 lowercase hex), `mime` (RFC format), `sizeBytes` (non-negative safe integer), `nowUtc` (UTC ISO ending in `Z`).
2. **Policy enforcement** — calls `assertEvidenceRegisterAllowed()` _before_ any DB write. Throws `EvidencePolicyError` on deny.
3. **Operation-level idempotency** — `SELECT evidence_operation WHERE operation_id = ?`. If found, returns the previously bound `documentId` immediately (`idempotentHit: true`), skipping all subsequent steps.
4. **Dedup-by-content** (optional) — when `dedupBySha256: true`, performs `SELECT` by `(orgId, sha256)` inside the transaction. Strict mode also matches `mime` + `sizeBytes`.
5. **Idempotent insert** — `INSERT … ON CONFLICT (orgId, objectKey) DO NOTHING`. On conflict, reads back existing row.
6. **Record operation** — inserts `(operationId, orgId, documentId)` into `evidence_operation` (ON CONFLICT DO NOTHING for concurrent-retry safety).
7. **Audit payload** — builds a canonical `auditEvent` via `buildEvidenceRegisterAuditEvent()`. The caller (API route) is responsible for persisting it.

---

### `evidence.link.ts`

Polymorphic entity ↔ document linking with cross-org guard.

| Export                 | Kind      | Description                                                                         |
| ---------------------- | --------- | ----------------------------------------------------------------------------------- |
| `AttachEvidenceParams` | interface | `orgId`, `documentId`, `entityType`, `entityId`, `label?`, `attachedByPrincipalId?` |
| `attachEvidence`       | function  | `(db, params) → Promise<string>` — returns evidence UUID                            |

Cross-org guard: `SELECT document WHERE id = ? AND orgId = ?` before `INSERT evidence`.
Throws if the document does not exist or belongs to a different org.

---

### `evidence.policy.ts`

Pure/deterministic evidence policy engine (~1 050 lines). No DB access — all
functions accept plain data and return decisions, obligations, or audit payloads.

**Branded identity types:**

| Type                  | Brand                   |
| --------------------- | ----------------------- |
| `EvidenceId`          | `"EvidenceId"`          |
| `UserId`              | `"UserId"`              |
| `WorkspaceId`         | `"WorkspaceId"`         |
| `LegalEntityId`       | `"LegalEntityId"`       |
| `EvidenceOperationId` | `"EvidenceOperationId"` |

**Domain enums (string unions):**

| Type                     | Values (summary)                                                    |
| ------------------------ | ------------------------------------------------------------------- |
| `EvidenceEntityType`     | `"invoice"`, `"journal_entry"`, `"supplier"`, `"purchase_order"`, … |
| `EvidenceKind`           | `"receipt"`, `"contract"`, `"delivery_note"`, `"bank_statement"`, … |
| `EvidenceScanStatus`     | `"pending"`, `"clean"`, `"infected"`, `"error"`                     |
| `EvidenceLifecycleState` | `"active"`, `"archived"`, `"pending_purge"`, `"purged"`             |
| `EvidenceSensitivity`    | `"normal"`, `"confidential"`, `"restricted"`                        |

**Core interfaces:**

| Interface                        | Purpose                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `EvidenceLegalHold`              | Legal-hold metadata (holdId, reason, issuedBy, issuedAt, expiresAt?)                     |
| `EvidenceMetadata`               | Full evidence record (all fields used by policy decisions)                               |
| `EvidencePolicyContext`          | Caller context: principalId, permissions, roles, workspaceId, orgId, …                   |
| `EvidencePolicyProof`            | Proof-of-authorization: operationId, justification, MFA, approvalGrantId                 |
| `EvidencePolicyIntent`           | `"view" \| "download" \| "attach" \| "archive" \| "purge" \| "legal_hold" \| "register"` |
| `EvidenceDenyReasonCode`         | Reason codes for policy denials                                                          |
| `EvidenceAuditEventType`         | Audit event discriminators including `"evidence.register"`                               |
| `EvidencePolicyObligations`      | Post-decision obligations (watermark, log, notify, redact)                               |
| `EvidencePolicyDecision`         | `{ allowed, intent, reasonCode?, obligations, proof, decidedAt }`                        |
| `RetentionRule`                  | Per-entity-type retention window (years) + archiveFirst flag                             |
| `EvidenceLifecycleEvent`         | `"activate" \| "archive" \| "request_purge" \| "execute_purge"`                          |
| `EvidenceAuditEvent`             | Full audit event record (type, actor, target, decision, details, ts)                     |
| `JustificationRedactionStrategy` | `"none" \| "mask" \| "hash" \| "remove"`                                                 |
| `EvidenceRegisterAuditDetails`   | Register-specific audit details (objectKey, sha256, created, deduped, …)                 |

**Constants:**

| Export                  | Description                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `EvidencePermissions`   | Frozen permission map: `view`, `download`, `attach`, `archive`, `purge`, `legal_hold`, `register` |
| `DefaultRetentionRules` | Frozen array of per-entity-type retention rules                                                   |

**Functions:**

| Function                          | Signature (summary)                                               | Purpose                                                                                         |
| --------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `computeRetention`                | `(entityType, rules?) → RetentionRule`                            | Look up retention window for an entity type                                                     |
| `isRetentionMetForPurge`          | `(metadata, rule, nowUtc) → boolean`                              | Check if retention period allows purge                                                          |
| `decideEvidenceIntent`            | `(intent, metadata, ctx, nowUtc, proof) → EvidencePolicyDecision` | Master policy decision — evaluates permissions, lifecycle, legal hold, sensitivity, obligations |
| `assertEvidenceAllowed`           | `(intent, metadata, ctx, nowUtc, proof) → EvidencePolicyDecision` | Same as `decideEvidenceIntent` but throws `EvidencePolicyError` on deny                         |
| `assertObligationsSatisfied`      | `(obligations) → void`                                            | Post-decision obligation check (throws on unmet)                                                |
| `nextLifecycleState`              | `(event, current, metadata, nowUtc) → EvidenceLifecycleState`     | State-machine transition for lifecycle events                                                   |
| `buildEvidenceAuditEvent`         | `(decision, ctx, metadata, nowUtc) → EvidenceAuditEvent`          | Build canonical audit payload for any evidence intent                                           |
| `redactJustificationForStorage`   | `(text, strategy) → string`                                       | Redact justification text before persistence                                                    |
| `assertEvidenceRegisterAllowed`   | `(ctx, nowUtc, proof) → EvidencePolicyDecision`                   | Lightweight register-specific policy check (no metadata needed)                                 |
| `buildEvidenceRegisterAuditEvent` | `(decision, ctx, nowUtc, proof, details) → EvidenceAuditEvent`    | Build canonical audit payload for register intent                                               |

**Error class:**

| Export                | Notes                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `EvidencePolicyError` | Extends `Error`. Fields: `intent`, `reasonCode`, `decision` (full `EvidencePolicyDecision`). |

---

### `index.ts`

Domain barrel — `export *` from `evidence.registry.js`, `evidence.link.js`, `evidence.policy.js`.
No logic.

---

## Security

### Cross-Org Guard

`attachEvidence()` performs a two-step operation:

1. `SELECT document WHERE id = ? AND orgId = ?` — ensures the document
   exists in the caller's org (prevents hijacking a document from another org).
2. `INSERT evidence` — only runs if step 1 succeeds.

This pattern is mandatory for **every** function that references a document by
ID. Never skip the org-scoping `WHERE` clause.

### Policy Enforcement (Register)

`registerDocument()` calls `assertEvidenceRegisterAllowed()` **before** any DB
write. The policy check verifies:

- The caller holds the `evidence:register` permission.
- The proof envelope (operationId, justification, MFA) satisfies obligations.

On denial the function throws `EvidencePolicyError` — the API route catches
this and returns HTTP 403 with the `reasonCode`.

### Idempotent Registration

Two layers of idempotency:

1. **Operation-level** (`evidence_operation` table) — `operationId` is the primary key. The same `operationId` always resolves to the same `documentId`, even if the `objectKey` changes between retries (e.g. client regenerates upload key on timeout). This is the "court-grade" guarantee.
2. **Object-key-level** (`document` table) — `(orgId, objectKey)` is unique. `ON CONFLICT DO NOTHING` prevents duplicate rows when the same upload key is resubmitted.

Both use `ON CONFLICT DO NOTHING` + read-back, which is safe at PostgreSQL `READ COMMITTED` isolation without advisory locks.

---

## `entityType` Governance

`AttachEvidenceParams.entityType` is a polymorphic discriminator (e.g.
`"invoice"`, `"journal_entry"`, `"supplier"`).

Adding a new value requires coordinating:

- `@afenda/contracts/evidence` — command schema validation
- `apps/api` — route that accepts the new entity type
- `apps/worker` — outbox handler if the attachment triggers an event
- `infra/audit.ts` — audit log entry format
- `evidence.policy.ts` — `DefaultRetentionRules` entry for the new type

Do not add new entity types in this directory alone.

---

## DB Tables Accessed

| Table                | Operation                                     | File                   |
| -------------------- | --------------------------------------------- | ---------------------- |
| `document`           | `INSERT` (ON CONFLICT DO NOTHING)             | `evidence.registry.ts` |
| `document`           | `SELECT` (org + sha256 dedup lookup)          | `evidence.registry.ts` |
| `document`           | `SELECT` (org + objectKey conflict read-back) | `evidence.registry.ts` |
| `document`           | `SELECT` (org-scoped existence check)         | `evidence.link.ts`     |
| `evidence_operation` | `SELECT` (operation-id lookup)                | `evidence.registry.ts` |
| `evidence_operation` | `INSERT` (ON CONFLICT DO NOTHING)             | `evidence.registry.ts` |
| `evidence`           | `INSERT`                                      | `evidence.link.ts`     |

**DB constraints relied upon:**

- `PRIMARY KEY (operation_id)` — `evidence_operation` (migration `0007`)
- `UNIQUE (org_id, object_key)` — `document_org_object_key_uidx` (migration `0006`)
- `INDEX (org_id, sha256)` — `document_sha256_idx`

---

## Future Growth

- `evidence.scan.ts` — virus-scan status tracking, quarantine gating
- `evidence.ocr.ts` — OCR result persistence and confidence scoring
- Strict SHA-256 dedup (promote index to `UNIQUE` if business rules warrant)
- Policy-gating for `attachEvidence()` (currently only guards `registerDocument()`)
- Obligation enforcement hooks (watermarking, notifications)

## Does NOT Belong Here

- `DocumentSchema`, `EvidenceLinkSchema` → `@afenda/contracts/evidence`
- DB table DDL (`document`, `evidence`) → `@afenda/db`
- Presigned-URL generation → `apps/api/src/services/s3.ts`
- Virus-scan workers, OCR processing → `apps/worker`
- UI file-upload components → `@afenda/ui` or `apps/web`
