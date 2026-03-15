import { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const ListReviewCyclesParamsSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const GetPerformanceReviewParamsSchema = z.object({
  performanceReviewId: UuidSchema,
});

export const ListReviewsByEmployeeParamsSchema = z.object({
  employmentId: UuidSchema,
  reviewCycleId: UuidSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const ListManagerReviewQueueParamsSchema = z.object({
  reviewerEmploymentId: UuidSchema,
  status: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export type ListReviewCyclesParams = z.infer<typeof ListReviewCyclesParamsSchema>;
export type GetPerformanceReviewParams = z.infer<typeof GetPerformanceReviewParamsSchema>;
export type ListReviewsByEmployeeParams = z.infer<typeof ListReviewsByEmployeeParamsSchema>;
export type ListManagerReviewQueueParams = z.infer<typeof ListManagerReviewQueueParamsSchema>;
