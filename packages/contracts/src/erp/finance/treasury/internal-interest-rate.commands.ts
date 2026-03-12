import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { internalInterestDayCountSchema } from "./internal-interest-rate.entity";

export const createInternalInterestRateCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  code: z.string().trim().min(1).max(64),
  legalEntityId: z.string().uuid().nullable().optional(),
  currencyCode: z.string().trim().length(3),
  annualRateBps: z.number().int().nonnegative(),
  dayCountConvention: internalInterestDayCountSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
});

export const activateInternalInterestRateCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  internalInterestRateId: z.string().uuid(),
});

export type CreateInternalInterestRateCommand = z.infer<
  typeof createInternalInterestRateCommandSchema
>;
export type ActivateInternalInterestRateCommand = z.infer<
  typeof activateInternalInterestRateCommandSchema
>;
