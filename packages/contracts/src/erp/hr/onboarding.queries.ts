import { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const OnboardingChecklistTaskSchema = z.object({
  onboardingTaskId: UuidSchema,
  taskName: z.string(),
  taskOwnerType: z.string().nullable(),
  assignedTo: UuidSchema.nullable(),
  status: z.string(),
  taskId: UuidSchema,
  taskCode: z.string().nullable(),
  taskTitle: z.string(),
  ownerEmployeeId: UuidSchema.nullable(),
  dueDate: z.string().nullable(),
  completedAt: z.string().nullable(),
  taskStatus: z.string(),
  mandatory: z.boolean(),
});

export const OnboardingChecklistSchema = z.object({
  status: z.string(),
  onboardingPlanId: UuidSchema,
  employmentId: UuidSchema,
  planStatus: z.string(),
  startDate: z.string().nullable(),
  targetCompletionDate: z.string().nullable(),
  completedAt: z.string().nullable(),
  tasks: z.array(OnboardingChecklistTaskSchema),
});

export const SeparationCaseItemSchema = z.object({
  exitClearanceItemId: UuidSchema,
  clearanceType: z.string(),
  ownerDepartment: z.string().nullable(),
  status: z.string(),
  itemId: UuidSchema,
  itemCode: z.string().nullable(),
  itemLabel: z.string(),
  ownerEmployeeId: UuidSchema.nullable(),
  mandatory: z.boolean(),
  clearanceStatus: z.string(),
  clearedAt: z.string().nullable(),
});

export const SeparationCaseViewSchema = z.object({
  caseNumber: z.string(),
  lastWorkingDate: z.string(),
  noticeGivenAt: z.string().nullable(),
  reasonCode: z.string().nullable(),
  status: z.string(),
  clearanceItems: z.array(SeparationCaseItemSchema),
  separationCaseId: UuidSchema,
  employmentId: UuidSchema,
  caseStatus: z.string(),
  separationType: z.string().nullable(),
  initiatedAt: z.string().nullable(),
  targetLastWorkingDate: z.string().nullable(),
  closedAt: z.string().nullable(),
  items: z.array(SeparationCaseItemSchema),
});

export const PendingOnboardingItemSchema = z.object({
  onboardingPlanId: UuidSchema,
  employmentId: UuidSchema,
  planStatus: z.string(),
  startDate: z.string().nullable(),
  targetCompletionDate: z.string().nullable(),
  pendingMandatoryTasks: z.number().int(),
  pendingTasks: z.number().int(),
});

export type OnboardingChecklistTask = z.infer<typeof OnboardingChecklistTaskSchema>;
export type OnboardingChecklist = z.infer<typeof OnboardingChecklistSchema>;
export type SeparationCaseItem = z.infer<typeof SeparationCaseItemSchema>;
export type SeparationCaseView = z.infer<typeof SeparationCaseViewSchema>;
export type PendingOnboardingItem = z.infer<typeof PendingOnboardingItemSchema>;
