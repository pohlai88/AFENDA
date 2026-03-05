# contracts/evidence — OWNERS

> **Package-wide rules (import boundaries, JSON-first types, barrel imports,
> file naming) are inherited from the root
> [`packages/contracts/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `evidence/` directory.**

## Purpose

Document / evidence attachment entity schema and write commands.
("evidence" language from ERP/audit practice — a file attached to prove a claim.)

Two distinct concepts live here:

- **Document** — the stored asset (S3 object key, SHA-256, MIME, size). One document can be attached to many entities.
- **Evidence attachment** — the polymorphic join between a document and a domain entity (invoice, journal entry, supplier). This is the relationship record, not the file itself.

Keep the model minimal-asset: contracts define shape only. Presigned URL generation, virus-scan state, and OCR output live outside contracts.

## File Conventions

| Pattern         | Purpose                                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.entity.ts`   | Read-model DTOs (`DocumentSchema`). JSON-safe only — no `Date` instances, no secrets.                                                                                                     |
| `*.commands.ts` | Write payloads (`RegisterDocumentCommandSchema`, `AttachEvidenceCommandSchema`). Must carry `idempotencyKey`; `RegisterDocument` must also carry `correlationId` for S3-callback tracing. |
| `*.events.ts`   | Domain events (future: `DOCUMENT_REGISTERED`, `EVIDENCE_ATTACHED`).                                                                                                                       |

## Files

| File                   | Key exports                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `evidence.entity.ts`   | `Sha256Schema`, `MimeTypeSchema`, `DocumentSchema`, `Document`, `EvidenceLinkSchema`, `EvidenceLink`                                                         |
| `evidence.commands.ts` | `EvidenceTargetSchema`, `EvidenceTarget`, `AttachEvidenceCommandSchema`, `AttachEvidenceCommand`, `RegisterDocumentCommandSchema`, `RegisterDocumentCommand` |
| `index.ts`             | Domain barrel — re-exports all of the above                                                                                                                  |

## Belongs Here

- `DocumentSchema` and inferred `Document` type
- `AttachEvidenceCommandSchema` — links a document to an invoice, journal entry, or supplier
- `RegisterDocumentCommandSchema` — called by API after client uploads to S3 (pre-signed URL flow)
- Future: `evidence.events.ts` for DOCUMENT_REGISTERED, EVIDENCE_ATTACHED events
- Future: OCR result schemas, document classification schemas (add `evidence.ocr.ts` when needed)
- All schemas here **must** use shared ID primitives:
  - `DocumentIdSchema` for `id` / `documentId`
  - `OrgIdSchema` for `orgId`
  - `InvoiceIdSchema`, `JournalEntryIdSchema`, `SupplierIdSchema` for typed `entityId` fields (prefer discriminated union over raw `EntityIdSchema` once all attachment targets are stable)

## `entityType` Governance

`AttachEvidenceCommandSchema.entityType` is a cross-domain polymorphic discriminator. **Adding a new value requires updating every consumer** (API route, worker job, DB attach logic, audit log). Coordinate with all OWNERS before adding `"supplier"`, `"payment"`, etc.

## Security / PII Boundary

- `objectKey` (S3 path) and `sha256` are infrastructure-sensitive — never log or expose in error responses.
- Contracts may carry these fields as opaque strings; masking/redaction belongs in core or the API layer.
- Document scan state (pending / clean / quarantined) vocabulary belongs here if it becomes a first-class field; transition logic belongs in `packages/core`.

## Does NOT Belong Here

- Document DB table → `packages/db/src/schema/document.ts`
- S3 / MinIO upload logic, presigned URL generation → `packages/core/src/evidence.ts` or `apps/api`
- Virus-scan or OCR processing → `apps/worker`
- Scan state machine / attachment authorization rules → `packages/core`
