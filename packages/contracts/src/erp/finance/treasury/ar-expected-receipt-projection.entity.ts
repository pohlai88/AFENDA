import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const ArExpectedReceiptProjectionStatusValues = [
  "open",
  "partially_received",
  "fully_received",
  "cancelled",
] as const;
export const ArExpectedReceiptProjectionStatusSchema = z.enum(
  ArExpectedReceiptProjectionStatusValues,
);

export const ArExpectedReceiptMethodValues = [
  "bank_transfer",
  "wire",
  "ach",
  "sepa",
  "cash",
  "manual",
] as const;
export const ArExpectedReceiptMethodSchema = z.enum(ArExpectedReceiptMethodValues);

export const ArExpectedReceiptProjectionIdSchema = brandedUuid("ArExpectedReceiptProjectionId");
export type ArExpectedReceiptProjectionId = z.infer<typeof ArExpectedReceiptProjectionIdSchema>;

export const ArExpectedReceiptProjectionSchema = z.object({
  id: ArExpectedReceiptProjectionIdSchema,
  orgId: OrgIdSchema,
  sourceReceivableId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(255),
  dueDate: z.string().date(),
  expectedReceiptDate: z.string().date(),
  currencyCode: CurrencyCodeSchema,
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  receiptMethod: ArExpectedReceiptMethodSchema.nullable(),
  status: ArExpectedReceiptProjectionStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type ArExpectedReceiptProjection = z.infer<typeof ArExpectedReceiptProjectionSchema>;
