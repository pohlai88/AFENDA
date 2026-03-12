import { z } from "zod";
import { idempotencyKeySchema, orgScopedMetadataSchema } from "./shared";
import { revaluationEventStatusSchema } from "./revaluation-event.entity";

export const createRevaluationEventCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  fxExposureId: z.string().uuid(),
  hedgeDesignationId: z.string().uuid().nullable().optional(),
  valuationDate: z.string().date(),
  priorRateSnapshotId: z.string().uuid().nullable().optional(),
  currentRateSnapshotId: z.string().uuid(),
  carryingAmountMinor: z.string(),
  revaluedAmountMinor: z.string(),
  revaluationDeltaMinor: z.string(),
});

export const updateRevaluationEventStatusCommandSchema = z.object({
  ...orgScopedMetadataSchema.shape,
  idempotencyKey: idempotencyKeySchema,
  revaluationEventId: z.string().uuid(),
  status: revaluationEventStatusSchema,
});

export type CreateRevaluationEventCommand = z.infer<typeof createRevaluationEventCommandSchema>;
export type UpdateRevaluationEventStatusCommand = z.infer<
  typeof updateRevaluationEventStatusCommandSchema
>;
