/**
 * Evidence write commands — attach and register.
 *
 * RULES:
 *   1. Commands carry `idempotencyKey` always — S3 callbacks are retried;
 *      the API/worker layer deduplicates on this key.
 *   2. `tenantId` is never in the command body — it is resolved from the
 *      request context by the API/worker layer.
 *   3. `EvidenceTargetSchema` is imported from `evidence.entity.ts` (the single
 *      source of truth). Commands must never redefine it.
 */
import { z } from "zod";
import {
  DocumentIdSchema,
} from "../shared/ids.js";
import { IdempotencyKeySchema } from "../shared/idempotency.js";
import { MimeTypeSchema, Sha256Schema, EvidenceTargetSchema } from "./evidence.entity.js";

export type { EvidenceTarget } from "./evidence.entity.js";

// ─── Attach existing document to a domain entity ────────────────────────────
export const AttachEvidenceCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  documentId:     DocumentIdSchema,
  target:         EvidenceTargetSchema,
  label:          z.string().trim().min(1).max(64).optional(),
});

export type AttachEvidenceCommand = z.infer<typeof AttachEvidenceCommandSchema>;

// ─── Register document (called after client uploads to object storage) ───────
export const RegisterDocumentCommandSchema = z.object({
  // Idempotency is important: S3 callbacks are retried; duplicates must be deduplicated.
  idempotencyKey: IdempotencyKeySchema,

  objectKey: z.string().trim().min(1).max(1024),
  sha256:    Sha256Schema,
  mime:      MimeTypeSchema,

  // JS safe integer covers all real-world file sizes (up to ~8 PB).
  // Must be positive AND within JS safe range — matches DocumentSchema.sizeBytes.
  sizeBytes: z.number().int().positive().safe(),

  // Optional metadata — future-proofs the contract without breaking current callers.
  originalFileName: z.string().trim().min(1).max(255).optional(),
});

export type RegisterDocumentCommand = z.infer<typeof RegisterDocumentCommandSchema>;
