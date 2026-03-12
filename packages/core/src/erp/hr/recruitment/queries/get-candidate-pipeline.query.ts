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
  requisitionId: string;
  candidateId: string;
  candidateCode: string;
  fullName: string;
  candidateStatus: string;
  applicationStage: string;
  appliedAt: string | null;
  interviewId: string | null;
  interviewType: string | null;
  interviewScheduledAt: string | null;
  interviewStatus: string | null;
  feedbackId: string | null;
  recommendation: string | null;
  offerId: string | null;
  offerNumber: string | null;
  offerStatus: string | null;
}

export interface CandidatePipelineInterviewView {
  interviewId: string;
  interviewType: string;
  scheduledAt: string;
  status: string;
}

export interface CandidatePipelineOfferView {
  offerId: string;
  offerNumber: string;
  offerStatus: string;
  proposedStartDate: string | null;
}

export interface CandidatePipelineApplicationView {
  applicationId: string;
  requisitionId: string;
  stageCode: string;
  applicationStatus: string;
  interviews: CandidatePipelineInterviewView[];
  offers: CandidatePipelineOfferView[];
}

export interface CandidatePipelineView {
  candidateId: string;
  candidateCode: string;
  fullName: string;
  currentStatus: string;
  applications: CandidatePipelineApplicationView[];
}

export async function getCandidatePipeline(
  db: DbClient,
  orgId: string,
  requisitionId: string,
): Promise<CandidatePipelineItem[]> {
  const rows = await db
    .select({
      applicationId: hrmCandidateApplications.id,
      requisitionId: hrmCandidateApplications.requisitionId,
      candidateId: hrmCandidates.id,
      candidateCode: hrmCandidates.candidateCode,
      fullName: hrmCandidates.fullName,
      candidateStatus: hrmCandidates.status,
      applicationStage: hrmCandidateApplications.applicationStage,
      appliedAt: hrmCandidateApplications.appliedAt,
      interviewId: hrmInterviews.id,
      interviewType: hrmInterviews.interviewType,
      interviewScheduledAt: hrmInterviews.scheduledAt,
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
    interviewScheduledAt: row.interviewScheduledAt ? String(row.interviewScheduledAt) : null,
    interviewStatus: row.interviewStatus ?? null,
    feedbackId: row.feedbackId ?? null,
    recommendation: row.recommendation ?? null,
    offerId: row.offerId ?? null,
    offerNumber: row.offerNumber ?? null,
    offerStatus: row.offerStatus ?? null,
  }));
}

export async function getCandidatePipelineByCandidate(
  db: DbClient,
  orgId: string,
  candidateId: string,
): Promise<CandidatePipelineItem[]> {
  const rows = await db
    .select({
      applicationId: hrmCandidateApplications.id,
      requisitionId: hrmCandidateApplications.requisitionId,
      candidateId: hrmCandidates.id,
      candidateCode: hrmCandidates.candidateCode,
      fullName: hrmCandidates.fullName,
      candidateStatus: hrmCandidates.status,
      applicationStage: hrmCandidateApplications.applicationStage,
      appliedAt: hrmCandidateApplications.appliedAt,
      interviewId: hrmInterviews.id,
      interviewType: hrmInterviews.interviewType,
      interviewScheduledAt: hrmInterviews.scheduledAt,
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
    .where(and(eq(hrmCandidateApplications.orgId, orgId), eq(hrmCandidateApplications.candidateId, candidateId)));

  return rows.map((row) => ({
    ...row,
    appliedAt: row.appliedAt ? String(row.appliedAt) : null,
    interviewId: row.interviewId ?? null,
    interviewType: row.interviewType ?? null,
    interviewScheduledAt: row.interviewScheduledAt ? String(row.interviewScheduledAt) : null,
    interviewStatus: row.interviewStatus ?? null,
    feedbackId: row.feedbackId ?? null,
    recommendation: row.recommendation ?? null,
    offerId: row.offerId ?? null,
    offerNumber: row.offerNumber ?? null,
    offerStatus: row.offerStatus ?? null,
  }));
}

export async function getCandidatePipelineViewByCandidate(
  db: DbClient,
  orgId: string,
  candidateId: string,
): Promise<CandidatePipelineView | null> {
  const rows = await getCandidatePipelineByCandidate(db, orgId, candidateId);
  if (rows.length === 0) {
    return null;
  }

  const first = rows[0];
  if (!first) {
    return null;
  }

  const applicationsById = new Map<string, CandidatePipelineApplicationView>();

  for (const row of rows) {
    const existing = applicationsById.get(row.applicationId);
    const app =
      existing ??
      {
        applicationId: row.applicationId,
        requisitionId: row.requisitionId,
        stageCode: row.applicationStage,
        applicationStatus: row.applicationStage,
        interviews: [],
        offers: [],
      };

    if (row.interviewId && !app.interviews.some((i) => i.interviewId === row.interviewId)) {
      app.interviews.push({
        interviewId: row.interviewId,
        interviewType: row.interviewType ?? "unknown",
        scheduledAt: row.interviewScheduledAt ?? "",
        status: row.interviewStatus ?? "unknown",
      });
    }

    if (row.offerId && !app.offers.some((o) => o.offerId === row.offerId)) {
      app.offers.push({
        offerId: row.offerId,
        offerNumber: row.offerNumber ?? "",
        offerStatus: row.offerStatus ?? "unknown",
        proposedStartDate: null,
      });
    }

    applicationsById.set(row.applicationId, app);
  }

  return {
    candidateId: first.candidateId,
    candidateCode: first.candidateCode,
    fullName: first.fullName,
    currentStatus: first.candidateStatus,
    applications: Array.from(applicationsById.values()),
  };
}