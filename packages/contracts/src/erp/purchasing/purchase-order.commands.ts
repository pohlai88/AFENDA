/**
 * Purchase Order command schemas.
 *
 * RULES:
 *   1. Every command MUST include idempotencyKey.
 *   2. Server-generated fields (id, timestamps, poNumber) are NOT in commands.
 */
import { z } from "zod";
import { SupplierIdSchema } from "../../shared/ids.js";
import { CurrencyCodeSchema } from "../../shared/money.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

// ── Create command ────────────────────────────────────────────────────────────

export const CreatePurchaseOrderCommandSchema = z.object({
  supplierId: SupplierIdSchema,
  amountMinor: z.coerce.bigint().positive(),
  currencyCode: CurrencyCodeSchema,
  idempotencyKey: IdempotencyKeySchema,
});

export type CreatePurchaseOrderCommand = z.infer<typeof CreatePurchaseOrderCommandSchema>;
