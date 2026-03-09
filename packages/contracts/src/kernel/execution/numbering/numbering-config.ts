/**
 * Numbering configuration contracts — admin surface over the sequence subsystem.
 *
 * RULES:
 *   1. These schemas are for the settings/admin surface only.
 *      The numbering service (nextNumber / ensureSequence) remains authoritative.
 *   2. seedNextValue may only INCREASE, never decrease (gap-free constraint).
 *   3. The sequence table PK is (org_id, entity_type, period_key).
 *      This surface shows the "unpartitioned" row (periodKey = "") as the
 *      default config, plus the current-year row if it differs.
 */
import { z } from "zod";
import { IdempotencyKeySchema } from "../idempotency/request-key.js";
import { SequenceEntityTypeValues } from "./sequence.js";

export const NumberingConfigEntrySchema = z.object({
  entityType: z.enum(SequenceEntityTypeValues),
  prefix: z.string().max(20),
  padWidth: z.number().int().min(2).max(10),
  nextValue: z.number().int().min(1),
  periodKey: z.string(),
});

export type NumberingConfigEntry = z.infer<typeof NumberingConfigEntrySchema>;

export const NumberingConfigResponseSchema = z.object({
  configs: z.array(NumberingConfigEntrySchema),
});

export type NumberingConfigResponse = z.infer<typeof NumberingConfigResponseSchema>;

export const UpdateNumberingConfigCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  entityType: z.enum(SequenceEntityTypeValues),
  /** New prefix string (e.g. "INV-", "BILL-"). Max 20 chars. */
  prefix: z.string().max(20).optional(),
  /** Zero-padding width for the counter. Min 2, max 10. */
  padWidth: z.number().int().min(2).max(10).optional(),
  /**
   * Seed the sequence counter to at least this value.
   * Only allowed to increase — never decrease (gap-free constraint).
   */
  seedNextValue: z.number().int().min(1).optional(),
});

export type UpdateNumberingConfigCommand = z.infer<typeof UpdateNumberingConfigCommandSchema>;
