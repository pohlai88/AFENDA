import { z } from "zod";
import { DateSchema, UtcDateTimeSchema } from "../../shared/datetime.js";
import { OrgIdSchema, UuidSchema } from "../../shared/ids.js";

export const ReviewCycleStatusValues = ["draft", "active", "closed"] as const;
export const ReviewCycleStatusSchema = z.enum(ReviewCycleStatusValues);

export const PerformanceReviewStatusValues = ["draft", "self_submitted", "manager_review", "completed"] as const;
export const PerformanceReviewStatusSchema = z.enum(PerformanceReviewStatusValues);

export const GoalStatusValues = ["draft", "in_progress", "completed", "cancelled"] as const;
export const GoalStatusSchema = z.enum(GoalStatusValues);

export const HrmReviewCycleSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  cycleCode: z.string().trim().min(1).max(50),
  cycleName: z.string().trim().min(1).max(255),
  startDate: DateSchema,
  endDate: DateSchema,
  status: ReviewCycleStatusSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPerformanceReviewSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  employmentId: UuidSchema,
  reviewCycleId: UuidSchema,
  reviewerEmploymentId: UuidSchema.nullable(),
  status: PerformanceReviewStatusSchema,
  overallRating: z.string().nullable(),
  selfSubmittedAt: UtcDateTimeSchema.nullable(),
  managerCompletedAt: UtcDateTimeSchema.nullable(),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmPerformanceGoalSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  performanceReviewId: UuidSchema,
  goalText: z.string().trim().min(1).max(1000),
  targetDate: DateSchema.nullable(),
  status: GoalStatusSchema,
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export const HrmCompetencyAssessmentSchema = z.object({
  id: UuidSchema,
  orgId: OrgIdSchema,
  performanceReviewId: UuidSchema,
  competencyCode: z.string().trim().min(1).max(50),
  rating: z.string().trim().min(1).max(20),
  createdAt: UtcDateTimeSchema,
  updatedAt: UtcDateTimeSchema,
});

export type HrmReviewCycle = z.infer<typeof HrmReviewCycleSchema>;
export type HrmPerformanceReview = z.infer<typeof HrmPerformanceReviewSchema>;
export type HrmPerformanceGoal = z.infer<typeof HrmPerformanceGoalSchema>;
export type HrmCompetencyAssessment = z.infer<typeof HrmCompetencyAssessmentSchema>;
