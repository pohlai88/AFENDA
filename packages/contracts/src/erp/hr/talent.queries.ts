import { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const GetTalentProfileParamsSchema = z.object({
  employmentId: UuidSchema,
});

export const ListSuccessionPlansParamsSchema = z.object({
  positionId: UuidSchema.optional(),
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const ListSuccessorsForPositionParamsSchema = z.object({
  positionId: UuidSchema,
  successionPlanId: UuidSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type GetTalentProfileParams = z.infer<typeof GetTalentProfileParamsSchema>;
export type ListSuccessionPlansParams = z.infer<typeof ListSuccessionPlansParamsSchema>;
export type ListSuccessorsForPositionParams = z.infer<typeof ListSuccessorsForPositionParamsSchema>;
