import { z } from "zod";

export const fxExposureStatusSchema = z.enum([
  "open",
  "partially_hedged",
  "fully_hedged",
  "closed",
  "cancelled",
]);

export const fxExposureSourceTypeSchema = z.enum([
  "ap_due_payment_projection",
  "ar_expected_receipt_projection",
  "intercompany_transfer",
  "manual_exposure",
]);

export const fxExposureDirectionSchema = z.enum(["buy", "sell"]);

export const fxExposureEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceType: fxExposureSourceTypeSchema,
  sourceId: z.string().uuid(),
  exposureNumber: z.string().trim().min(1).max(64),
  exposureDate: z.string().date(),
  valueDate: z.string().date(),
  baseCurrencyCode: z.string().trim().length(3),
  quoteCurrencyCode: z.string().trim().length(3),
  direction: fxExposureDirectionSchema,
  grossAmountMinor: z.string(),
  openAmountMinor: z.string(),
  hedgedAmountMinor: z.string(),
  status: fxExposureStatusSchema,
  sourceVersion: z.string().trim().min(1).max(128),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FxExposureEntity = z.infer<typeof fxExposureEntitySchema>;
export type FxExposureStatus = z.infer<typeof fxExposureStatusSchema>;
export type FxExposureSourceType = z.infer<typeof fxExposureSourceTypeSchema>;
export type FxExposureDirection = z.infer<typeof fxExposureDirectionSchema>;

export const fxExposureStatusValues = fxExposureStatusSchema.options;
export const fxExposureSourceTypeValues = fxExposureSourceTypeSchema.options;
export const fxExposureDirectionValues = fxExposureDirectionSchema.options;
