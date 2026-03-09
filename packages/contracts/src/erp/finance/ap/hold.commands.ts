/**
 * Command schemas for AP Hold — create hold, release hold.
 *
 * RULES:
 *   1. Every command MUST include idempotencyKey.
 *   2. Server-generated fields (id, timestamps, actorPrincipalId) are NOT in commands.
 *   3. Error codes: AP_HOLD_* in shared/errors.ts.
 *   4. Audit actions: ap.hold.* in kernel/governance/audit/actions.ts.
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../../../kernel/execution/idempotency/request-key.js";
import { InvoiceIdSchema } from "../../../shared/ids.js";
import { HoldIdSchema, HoldTypeValues } from "./hold.entity.js";

// ── Create Hold command ───────────────────────────────────────────────────────

export const CreateHoldCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Invoice to place hold on */
  invoiceId: InvoiceIdSchema,
  /** Type of hold */
  holdType: z.enum(HoldTypeValues),
  /** Reason for placing the hold */
  holdReason: z.string().trim().min(1).max(500),
});

export type CreateHoldCommand = z.infer<typeof CreateHoldCommandSchema>;

// ── Release Hold command ──────────────────────────────────────────────────────

export const ReleaseHoldCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  /** Hold to release */
  holdId: HoldIdSchema,
  /** Reason for releasing the hold */
  releaseReason: z.string().trim().min(1).max(500),
});

export type ReleaseHoldCommand = z.infer<typeof ReleaseHoldCommandSchema>;
