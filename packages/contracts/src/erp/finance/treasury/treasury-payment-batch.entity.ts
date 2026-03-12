import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { PaymentBatchStatusValues } from "./treasury-shared.entity.js";
import { BankAccountIdSchema } from "./bank-account.entity.js";

export const PaymentBatchIdSchema = brandedUuid("PaymentBatchId");
export type PaymentBatchId = z.infer<typeof PaymentBatchIdSchema>;

export const PaymentBatchSchema = z.object({
  id: PaymentBatchIdSchema,
  orgId: OrgIdSchema,
  sourceBankAccountId: BankAccountIdSchema,
  description: z.string().nullable(),
  status: z.enum(PaymentBatchStatusValues),
  /** Total amount across all instructions in minor units, as string */
  totalAmountMinor: z.string(),
  itemCount: z.number().int().nonnegative(),
  requestedReleaseAt: UtcDateTimeSchema.nullable(),
  approvedAt: UtcDateTimeSchema.nullable(),
  releasedAt: UtcDateTimeSchema.nullable(),
  failedAt: UtcDateTimeSchema.nullable(),
  failureReason: z.string().nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});
export type PaymentBatch = z.infer<typeof PaymentBatchSchema>;

export const PaymentBatchItemSchema = z.object({
  id: z.string().uuid(),
  orgId: OrgIdSchema,
  batchId: PaymentBatchIdSchema,
  paymentInstructionId: z.string().uuid(),
  amountMinor: z.string(),
  createdAt: UtcDateTimeSchema,
});
export type PaymentBatchItem = z.infer<typeof PaymentBatchItemSchema>;
