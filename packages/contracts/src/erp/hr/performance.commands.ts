import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const CreateReviewCycleCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  cycleCode: z.string().trim().min(1).max(50),
  cycleName: z.string().trim().min(1).max(255),
  startDate: DateSchema,
  endDate: DateSchema,
});

export const CreatePerformanceReviewCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  reviewCycleId: UuidSchema,
  reviewerEmploymentId: UuidSchema.nullable().optional(),
});

export const SubmitSelfReviewCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  performanceReviewId: UuidSchema,
});

export const CompleteManagerReviewCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  performanceReviewId: UuidSchema,
  overallRating: z.string().trim().min(1).max(50),
});

export const CreateGoalCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  performanceReviewId: UuidSchema,
  goalText: z.string().trim().min(1).max(1000),
  targetDate: DateSchema.nullable().optional(),
});

export const CreateReviewCycleResultSchema = z.object({
  reviewCycleId: UuidSchema,
  cycleCode: z.string(),
  status: z.string(),
});

export const CreatePerformanceReviewResultSchema = z.object({
  performanceReviewId: UuidSchema,
  status: z.string(),
});

export const SubmitSelfReviewResultSchema = z.object({
  performanceReviewId: UuidSchema,
  status: z.string(),
});

export const CompleteManagerReviewResultSchema = z.object({
  performanceReviewId: UuidSchema,
  status: z.string(),
});

export const CreateGoalResultSchema = z.object({
  goalId: UuidSchema,
});

export type CreateReviewCycleCommand = z.infer<typeof CreateReviewCycleCommandSchema>;
export type CreatePerformanceReviewCommand = z.infer<typeof CreatePerformanceReviewCommandSchema>;
export type SubmitSelfReviewCommand = z.infer<typeof SubmitSelfReviewCommandSchema>;
export type CompleteManagerReviewCommand = z.infer<typeof CompleteManagerReviewCommandSchema>;
export type CreateGoalCommand = z.infer<typeof CreateGoalCommandSchema>;
export type CreateReviewCycleResult = z.infer<typeof CreateReviewCycleResultSchema>;
export type CreatePerformanceReviewResult = z.infer<typeof CreatePerformanceReviewResultSchema>;
export type SubmitSelfReviewResult = z.infer<typeof SubmitSelfReviewResultSchema>;
export type CompleteManagerReviewResult = z.infer<typeof CompleteManagerReviewResultSchema>;
export type CreateGoalResult = z.infer<typeof CreateGoalResultSchema>;
