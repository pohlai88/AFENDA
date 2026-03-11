import type { DbClient } from "@afenda/db";
import {
  hrmCandidateApplications,
  hrmCandidates,
  hrmInterviewFeedback,
  hrmInterviews,
  hrmOffers,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface CandidatePipelineItem {
  applicationId: string;
  candidateId: string;
  candidateCode: string;
  fullName: string;
  applicationStage: string;
  appliedAt: string | null;
  interviewId: string | null;
  interviewType: string | null;
  interviewStatus: string | null;
  feedbackId: string | null;
  recommendation: string | null;
  offerId: string | null;
  offerNumber: string | null;
  offerStatus: string | null;
}

export async function getCandidatePipeline(
  db: DbClient,
  orgId: string,
  requisitionId: string,
): Promise<CandidatePipelineItem[]> {
  const rows = await db
    .select({
      applicationId: hrmCandidateApplications.id,
      candidateId: hrmCandidates.id,
      candidateCode: hrmCandidates.candidateCode,
      fullName: hrmCandidates.fullName,
      applicationStage: hrmCandidateApplications.applicationStage,
      appliedAt: hrmCandidateApplications.appliedAt,
      interviewId: hrmInterviews.id,
      interviewType: hrmInterviews.interviewType,
      interviewStatus: hrmInterviews.status,
      feedbackId: hrmInterviewFeedback.id,
      recommendation: hrmInterviewFeedback.recommendation,
      offerId: hrmOffers.id,
      offerNumber: hrmOffers.offerNumber,
      offerStatus: hrmOffers.offerStatus,
    })
    .from(hrmCandidateApplications)
    .innerJoin(
      hrmCandidates,
      and(
        eq(hrmCandidates.orgId, hrmCandidateApplications.orgId),
        eq(hrmCandidates.id, hrmCandidateApplications.candidateId),
      ),
    )
    .leftJoin(
      hrmInterviews,
      and(
        eq(hrmInterviews.orgId, hrmCandidateApplications.orgId),
        eq(hrmInterviews.applicationId, hrmCandidateApplications.id),
      ),
    )
    .leftJoin(
      hrmInterviewFeedback,
      and(
        eq(hrmInterviewFeedback.orgId, hrmCandidateApplications.orgId),
        eq(hrmInterviewFeedback.interviewId, hrmInterviews.id),
      ),
    )
    .leftJoin(
      hrmOffers,
      and(
        eq(hrmOffers.orgId, hrmCandidateApplications.orgId),
        eq(hrmOffers.applicationId, hrmCandidateApplications.id),
      ),
    )
    .where(
      and(
        eq(hrmCandidateApplications.orgId, orgId),
        eq(hrmCandidateApplications.requisitionId, requisitionId),
      ),
    );

  return rows.map((row) => ({
    ...row,
    appliedAt: row.appliedAt ? String(row.appliedAt) : null,
    interviewId: row.interviewId ?? null,
    interviewType: row.interviewType ?? null,
    interviewStatus: row.interviewStatus ?? null,
    feedbackId: row.feedbackId ?? null,
    recommendation: row.recommendation ?? null,
    offerId: row.offerId ?? null,
    offerNumber: row.offerNumber ?? null,
    offerStatus: row.offerStatus ?? null,
  }));
}