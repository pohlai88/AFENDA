import { z } from "zod";
import { UuidSchema } from "../../shared/ids.js";

export const ListRequisitionsInputSchema = z.object({
  requisitionId: UuidSchema.optional(),
  status: z.string().trim().min(1).max(50).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const RequisitionListItemSchema = z.object({
  requisitionId: UuidSchema,
  requisitionNumber: z.string(),
  requisitionTitle: z.string(),
  legalEntityId: UuidSchema,
  orgUnitId: UuidSchema.nullable(),
  positionId: UuidSchema.nullable(),
  hiringManagerEmployeeId: UuidSchema.nullable(),
  requestedHeadcount: z.string(),
  requestedStartDate: z.string().nullable(),
  status: z.string(),
});

export const ListRequisitionsResultSchema = z.object({
  items: z.array(RequisitionListItemSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const ApplicationViewSchema = z.object({
  applicationId: UuidSchema,
  candidateId: UuidSchema,
  candidateCode: z.string(),
  candidateName: z.string(),
  requisitionId: UuidSchema,
  requisitionNumber: z.string(),
  requisitionTitle: z.string(),
  applicationStage: z.string(),
  appliedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
});

export const CandidatePipelineItemSchema = z.object({
  applicationId: UuidSchema,
  requisitionId: UuidSchema,
  candidateId: UuidSchema,
  candidateCode: z.string(),
  fullName: z.string(),
  candidateStatus: z.string(),
  applicationStage: z.string(),
  appliedAt: z.string().nullable(),
  interviewId: UuidSchema.nullable(),
  interviewType: z.string().nullable(),
  interviewScheduledAt: z.string().nullable(),
  interviewStatus: z.string().nullable(),
  feedbackId: UuidSchema.nullable(),
  recommendation: z.string().nullable(),
  offerId: UuidSchema.nullable(),
  offerNumber: z.string().nullable(),
  offerStatus: z.string().nullable(),
});

export const CandidatePipelineInterviewViewSchema = z.object({
  interviewId: UuidSchema,
  interviewType: z.string(),
  scheduledAt: z.string(),
  status: z.string(),
});

export const CandidatePipelineOfferViewSchema = z.object({
  offerId: UuidSchema,
  offerNumber: z.string(),
  offerStatus: z.string(),
  proposedStartDate: z.string().nullable(),
});

export const CandidatePipelineApplicationViewSchema = z.object({
  applicationId: UuidSchema,
  requisitionId: UuidSchema,
  stageCode: z.string(),
  applicationStatus: z.string(),
  interviews: z.array(CandidatePipelineInterviewViewSchema),
  offers: z.array(CandidatePipelineOfferViewSchema),
});

export const CandidatePipelineViewSchema = z.object({
  candidateId: UuidSchema,
  candidateCode: z.string(),
  fullName: z.string(),
  currentStatus: z.string(),
  applications: z.array(CandidatePipelineApplicationViewSchema),
});

export type ListRequisitionsInput = z.infer<typeof ListRequisitionsInputSchema>;
export type RequisitionListItem = z.infer<typeof RequisitionListItemSchema>;
export type ListRequisitionsResult = z.infer<typeof ListRequisitionsResultSchema>;
export type ApplicationView = z.infer<typeof ApplicationViewSchema>;
export type CandidatePipelineItem = z.infer<typeof CandidatePipelineItemSchema>;
export type CandidatePipelineInterviewView = z.infer<typeof CandidatePipelineInterviewViewSchema>;
export type CandidatePipelineOfferView = z.infer<typeof CandidatePipelineOfferViewSchema>;
export type CandidatePipelineApplicationView = z.infer<
  typeof CandidatePipelineApplicationViewSchema
>;
export type CandidatePipelineView = z.infer<typeof CandidatePipelineViewSchema>;
