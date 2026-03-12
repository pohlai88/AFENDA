import { z } from "zod";

export const hedgeDesignationStatusSchema = z.enum([
  "draft",
  "designated",
  "de-designated",
  "expired",
]);

export const hedgeInstrumentTypeSchema = z.enum([
  "fx_forward",
  "fx_swap",
  "natural_hedge",
  "manual_proxy",
]);

export const hedgeRelationshipTypeSchema = z.enum([
  "cash_flow_hedge",
  "fair_value_hedge",
  "economic_hedge",
]);

export const hedgeDesignationEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  hedgeNumber: z.string().trim().min(1).max(64),
  fxExposureId: z.string().uuid(),
  hedgeInstrumentType: hedgeInstrumentTypeSchema,
  hedgeRelationshipType: hedgeRelationshipTypeSchema,
  designatedAmountMinor: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  status: hedgeDesignationStatusSchema,
  designationMemo: z.string().trim().max(1000).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type HedgeDesignationEntity = z.infer<typeof hedgeDesignationEntitySchema>;
export type HedgeDesignationStatus = z.infer<typeof hedgeDesignationStatusSchema>;
export type HedgeInstrumentType = z.infer<typeof hedgeInstrumentTypeSchema>;
export type HedgeRelationshipType = z.infer<typeof hedgeRelationshipTypeSchema>;

export const hedgeDesignationStatusValues = hedgeDesignationStatusSchema.options;
export const hedgeInstrumentTypeValues = hedgeInstrumentTypeSchema.options;
export const hedgeRelationshipTypeValues = hedgeRelationshipTypeSchema.options;
