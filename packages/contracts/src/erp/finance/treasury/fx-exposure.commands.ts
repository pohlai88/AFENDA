import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { fxExposureDirectionSchema, fxExposureSourceTypeSchema } from "./fx-exposure.entity";

export const createFxExposureCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  sourceType: fxExposureSourceTypeSchema,
  sourceId: z.string().uuid(),
  exposureNumber: z.string().trim().min(1).max(64),
  exposureDate: z.string().date(),
  valueDate: z.string().date(),
  baseCurrencyCode: z.string().trim().length(3),
  quoteCurrencyCode: z.string().trim().length(3),
  direction: fxExposureDirectionSchema,
  grossAmountMinor: z.string(),
  sourceVersion: z.string().trim().min(1).max(128),
});

export const closeFxExposureCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  fxExposureId: z.string().uuid(),
});

export type CreateFxExposureCommand = z.infer<typeof createFxExposureCommandSchema>;
export type CloseFxExposureCommand = z.infer<typeof closeFxExposureCommandSchema>;
