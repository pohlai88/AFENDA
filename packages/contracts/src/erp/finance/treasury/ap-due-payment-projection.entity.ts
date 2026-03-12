import { z } from "zod";
import { brandedUuid, OrgIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";
import { CurrencyCodeSchema } from "../../../shared/money.js";

export const ApDuePaymentProjectionStatusValues = [
  "open",
  "partially_paid",
  "fully_paid",
  "cancelled",
] as const;
export const ApDuePaymentProjectionStatusSchema = z.enum(ApDuePaymentProjectionStatusValues);

export const ApDuePaymentMethodValues = [
  "bank_transfer",
  "wire",
  "ach",
  "sepa",
  "manual",
] as const;
export const ApDuePaymentMethodSchema = z.enum(ApDuePaymentMethodValues);

export const ApDuePaymentProjectionIdSchema = brandedUuid("ApDuePaymentProjectionId");
export type ApDuePaymentProjectionId = z.infer<typeof ApDuePaymentProjectionIdSchema>;

export const ApDuePaymentProjectionSchema = z.object({
  id: ApDuePaymentProjectionIdSchema,
  orgId: OrgIdSchema,
  sourcePayableId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string().trim().min(1).max(255),
  paymentTermCode: z.string().trim().max(64).nullable(),
  dueDate: z.string().date(),
  expectedPaymentDate: z.string().date(),
  currencyCode: CurrencyCodeSchema,
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  paymentMethod: ApDuePaymentMethodSchema.nullable(),
  status: ApDuePaymentProjectionStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type ApDuePaymentProjection = z.infer<typeof ApDuePaymentProjectionSchema>;
