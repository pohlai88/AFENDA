/**
 * Receipt command schemas.
 */
import { z } from "zod";
import { PurchaseOrderIdSchema } from "./purchase-order.entity.js";
import { CurrencyCodeSchema } from "../../shared/money.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";

// ── Create command ────────────────────────────────────────────────────────────

export const CreateReceiptCommandSchema = z.object({
  purchaseOrderId: PurchaseOrderIdSchema,
  amountMinor: z.coerce.bigint().positive(),
  currencyCode: CurrencyCodeSchema,
  idempotencyKey: IdempotencyKeySchema,
});

export type CreateReceiptCommand = z.infer<typeof CreateReceiptCommandSchema>;
