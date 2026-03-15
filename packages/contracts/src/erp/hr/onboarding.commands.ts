import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const StartOnboardingTaskInputSchema = z.object({
  taskCode: z.string().trim().min(1).max(50).optional(),
  taskTitle: z.string().trim().min(1).max(255),
  ownerEmployeeId: UuidSchema.optional(),
  dueDate: z.string().min(1).optional(),
  mandatory: z.boolean().optional(),
});

export const StartOnboardingCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  templateId: UuidSchema.optional(),
  startDate: z.string().min(1).optional(),
  targetCompletionDate: z.string().min(1).optional(),
  tasks: z.array(StartOnboardingTaskInputSchema).optional(),
});

export const CompleteOnboardingTaskCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  onboardingTaskId: UuidSchema,
  completedAt: z.string().min(1),
});

export const RecordProbationReviewCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  reviewDueDate: z.string().min(1).optional(),
  reviewStatus: z.string().trim().max(50).optional(),
  decisionCode: z.string().trim().max(50).optional(),
  confirmedAt: z.string().min(1).optional(),
  reviewDate: z.string().min(1).optional(),
  outcome: z.string().trim().max(255).optional(),
  reviewerEmployeeId: UuidSchema.optional(),
  comments: z.string().trim().max(5000).optional(),
});

export const StartSeparationItemInputSchema = z.object({
  itemCode: z.string().trim().min(1).max(50).optional(),
  itemLabel: z.string().trim().min(1).max(255),
  ownerEmployeeId: UuidSchema.optional(),
  mandatory: z.boolean().optional(),
});

export const StartSeparationCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  employmentId: UuidSchema,
  separationType: z.string().trim().max(50).optional(),
  initiatedAt: z.string().min(1).optional(),
  targetLastWorkingDate: z.string().min(1).optional(),
  items: z.array(StartSeparationItemInputSchema).optional(),
});

export const ClearExitItemCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  exitClearanceItemId: UuidSchema,
  clearedAt: z.string().min(1),
});

export const FinalizeSeparationCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  separationCaseId: UuidSchema,
});

export const StartOnboardingResultSchema = z.object({
  onboardingPlanId: UuidSchema,
  taskIds: z.array(UuidSchema),
});

export const CompleteOnboardingTaskResultSchema = z.object({
  onboardingTaskId: UuidSchema,
  status: z.string(),
  completedAt: z.string(),
});

export const RecordProbationReviewResultSchema = z.object({
  probationReviewId: UuidSchema,
  employmentId: UuidSchema,
  reviewStatus: z.string(),
});

export const StartSeparationResultSchema = z.object({
  separationCaseId: UuidSchema,
  itemIds: z.array(UuidSchema),
});

export const ClearExitItemResultSchema = z.object({
  exitClearanceItemId: UuidSchema,
  status: z.string(),
  clearedAt: z.string(),
});

export const FinalizeSeparationResultSchema = z.object({
  separationCaseId: UuidSchema,
  status: z.string(),
});

export type StartOnboardingTaskInput = z.infer<typeof StartOnboardingTaskInputSchema>;
export type StartOnboardingCommand = z.infer<typeof StartOnboardingCommandSchema>;
export type CompleteOnboardingTaskCommand = z.infer<typeof CompleteOnboardingTaskCommandSchema>;
export type RecordProbationReviewCommand = z.infer<typeof RecordProbationReviewCommandSchema>;
export type StartSeparationItemInput = z.infer<typeof StartSeparationItemInputSchema>;
export type StartSeparationCommand = z.infer<typeof StartSeparationCommandSchema>;
export type ClearExitItemCommand = z.infer<typeof ClearExitItemCommandSchema>;
export type FinalizeSeparationCommand = z.infer<typeof FinalizeSeparationCommandSchema>;
export type StartOnboardingResult = z.infer<typeof StartOnboardingResultSchema>;
export type CompleteOnboardingTaskResult = z.infer<typeof CompleteOnboardingTaskResultSchema>;
export type RecordProbationReviewResult = z.infer<typeof RecordProbationReviewResultSchema>;
export type StartSeparationResult = z.infer<typeof StartSeparationResultSchema>;
export type ClearExitItemResult = z.infer<typeof ClearExitItemResultSchema>;
export type FinalizeSeparationResult = z.infer<typeof FinalizeSeparationResultSchema>;
