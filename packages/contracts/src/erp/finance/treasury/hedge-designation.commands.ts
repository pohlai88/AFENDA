import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { hedgeInstrumentTypeSchema, hedgeRelationshipTypeSchema } from "./hedge-designation.entity";

export const designateHedgeCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  hedgeNumber: z.string().trim().min(1).max(64),
  fxExposureId: z.string().uuid(),
  hedgeInstrumentType: hedgeInstrumentTypeSchema,
  hedgeRelationshipType: hedgeRelationshipTypeSchema,
  designatedAmountMinor: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date().nullable().optional(),
  designationMemo: z.string().trim().max(1000).nullable().optional(),
});

export const deDesignateHedgeCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  hedgeDesignationId: z.string().uuid(),
});

export type DesignateHedgeCommand = z.infer<typeof designateHedgeCommandSchema>;
export type DeDesignateHedgeCommand = z.infer<typeof deDesignateHedgeCommandSchema>;
