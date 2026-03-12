import { z } from "zod";

export const internalInterestRateStatusValues = ["draft", "active", "inactive"] as const;

export const internalInterestDayCountValues = ["actual_360", "actual_365", "30_360"] as const;

export const internalInterestRateStatusSchema = z.enum(internalInterestRateStatusValues);
export const internalInterestDayCountSchema = z.enum(internalInterestDayCountValues);

export const internalInterestRateEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  legalEntityId: z.string().uuid().nullable(),
  currencyCode: z.string().trim().length(3),
  annualRateBps: z.number().int().nonnegative(),
  dayCountConvention: internalInterestDayCountSchema,
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable(),
  status: internalInterestRateStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type InternalInterestRateEntity = z.infer<typeof internalInterestRateEntitySchema>;
