import { z } from "zod";
import { IdempotencyKeySchema } from "../../kernel/execution/idempotency/request-key.js";
import { UuidSchema } from "../../shared/ids.js";

export const CreateCandidateCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  candidateCode: z.string().trim().min(1).max(50).optional(),
  fullName: z.string().trim().min(1).max(255),
  email: z.string().email().max(320).optional(),
  mobilePhone: z.string().trim().max(50).optional(),
  sourceChannel: z.string().trim().max(50).optional(),
  status: z.string().trim().max(50).optional(),
});

export const CreateRequisitionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  requisitionNumber: z.string().trim().min(1).max(50).optional(),
  requisitionTitle: z.string().trim().min(1).max(255),
  legalEntityId: UuidSchema,
  orgUnitId: UuidSchema.optional(),
  positionId: UuidSchema.optional(),
  hiringManagerEmployeeId: UuidSchema.optional(),
  requestedHeadcount: z.string().trim().min(1).optional(),
  requestedStartDate: z.string().min(1).optional(),
});

export const ApproveRequisitionCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  requisitionId: UuidSchema,
  comment: z.string().trim().max(1000).optional(),
});

export const SubmitApplicationCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  candidateId: UuidSchema,
  requisitionId: UuidSchema,
  applicationDate: z.string().min(1),
  stageCode: z.string().trim().max(50).optional(),
  ownerUserId: UuidSchema.optional(),
});

export const ScheduleInterviewCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  applicationId: UuidSchema,
  interviewType: z.string().trim().min(1).max(50),
  scheduledAt: z.string().min(1),
  locationOrLink: z.string().trim().max(500).optional(),
  interviewerEmployeeId: UuidSchema.optional(),
  status: z.string().trim().max(50).optional(),
});

export const SubmitInterviewFeedbackCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  interviewId: UuidSchema,
  reviewerEmployeeId: UuidSchema.optional(),
  rating: z.number().optional(),
  recommendation: z.string().trim().max(100).optional(),
  feedbackText: z.string().trim().max(5000).optional(),
  comments: z.string().trim().max(5000).optional(),
  submittedAt: z.string().min(1).optional(),
});

export const IssueOfferCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  applicationId: UuidSchema,
  offerNumber: z.string().trim().min(1).max(50).optional(),
  offeredPositionId: UuidSchema.optional(),
  proposedStartDate: z.string().min(1).optional(),
  baseSalaryAmount: z.string().trim().min(1).optional(),
  currencyCode: z.string().trim().length(3).optional(),
});

export const AcceptOfferCommandSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  offerId: UuidSchema,
  acceptedAt: z.string().min(1),
  autoStartOnboarding: z.boolean().optional(),
  onboardingTemplateId: UuidSchema.optional(),
});

export const CreateCandidateResultSchema = z.object({
  candidateId: UuidSchema,
  candidateCode: z.string(),
});

export const CreateRequisitionResultSchema = z.object({
  requisitionId: UuidSchema,
  requisitionNumber: z.string(),
});

export const ApproveRequisitionResultSchema = z.object({
  requisitionId: UuidSchema,
  status: z.string(),
  approvedAt: z.string(),
});

export const SubmitApplicationResultSchema = z.object({
  applicationId: UuidSchema,
  candidateId: UuidSchema,
  requisitionId: UuidSchema,
  stageCode: z.string(),
});

export const ScheduleInterviewResultSchema = z.object({
  interviewId: UuidSchema,
  applicationId: UuidSchema,
  status: z.string(),
});

export const SubmitInterviewFeedbackResultSchema = z.object({
  interviewFeedbackId: UuidSchema,
  interviewId: UuidSchema,
  feedbackId: UuidSchema,
});

export const IssueOfferResultSchema = z.object({
  offerId: UuidSchema,
  offerNumber: z.string(),
  offerStatus: z.string(),
});

export const AcceptOfferResultSchema = z.object({
  offerId: UuidSchema,
  offerStatus: z.string(),
  acceptedAt: z.string(),
  onboardingPlanId: UuidSchema.optional(),
});

export type CreateCandidateCommand = z.infer<typeof CreateCandidateCommandSchema>;
export type CreateRequisitionCommand = z.infer<typeof CreateRequisitionCommandSchema>;
export type ApproveRequisitionCommand = z.infer<typeof ApproveRequisitionCommandSchema>;
export type SubmitApplicationCommand = z.infer<typeof SubmitApplicationCommandSchema>;
export type ScheduleInterviewCommand = z.infer<typeof ScheduleInterviewCommandSchema>;
export type SubmitInterviewFeedbackCommand = z.infer<typeof SubmitInterviewFeedbackCommandSchema>;
export type IssueOfferCommand = z.infer<typeof IssueOfferCommandSchema>;
export type AcceptOfferCommand = z.infer<typeof AcceptOfferCommandSchema>;
export type CreateCandidateResult = z.infer<typeof CreateCandidateResultSchema>;
export type CreateRequisitionResult = z.infer<typeof CreateRequisitionResultSchema>;
export type ApproveRequisitionResult = z.infer<typeof ApproveRequisitionResultSchema>;
export type SubmitApplicationResult = z.infer<typeof SubmitApplicationResultSchema>;
export type ScheduleInterviewResult = z.infer<typeof ScheduleInterviewResultSchema>;
export type SubmitInterviewFeedbackResult = z.infer<typeof SubmitInterviewFeedbackResultSchema>;
export type IssueOfferResult = z.infer<typeof IssueOfferResultSchema>;
export type AcceptOfferResult = z.infer<typeof AcceptOfferResultSchema>;
