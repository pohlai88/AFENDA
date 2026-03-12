import { z } from "zod";

export const revaluationEventStatusSchema = z.enum(["pending", "calculated", "posted", "failed"]);

export const revaluationEventEntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  fxExposureId: z.string().uuid(),
  hedgeDesignationId: z.string().uuid().nullable(),
  valuationDate: z.string().date(),
  priorRateSnapshotId: z.string().uuid().nullable(),
  currentRateSnapshotId: z.string().uuid(),
  carryingAmountMinor: z.string(),
  revaluedAmountMinor: z.string(),
  revaluationDeltaMinor: z.string(),
  status: revaluationEventStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RevaluationEventEntity = z.infer<typeof revaluationEventEntitySchema>;
export type RevaluationEventStatus = z.infer<typeof revaluationEventStatusSchema>;

export const revaluationEventStatusValues = revaluationEventStatusSchema.options;
