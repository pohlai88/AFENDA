import type { DbClient } from "@afenda/db";
import { hrmCandidateApplications, hrmCandidates, hrmJobRequisitions } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface ApplicationView {
  applicationId: string;
  candidateId: string;
  candidateCode: string;
  candidateName: string;
  requisitionId: string;
  requisitionNumber: string;
  requisitionTitle: string;
  applicationStage: string;
  appliedAt: string | null;
  rejectedAt: string | null;
}

export async function getApplication(
  db: DbClient,
  orgId: string,
  applicationId: string,
): Promise<ApplicationView | null> {
  const [row] = await db
    .select({
      applicationId: hrmCandidateApplications.id,
      candidateId: hrmCandidates.id,
      candidateCode: hrmCandidates.candidateCode,
      candidateName: hrmCandidates.fullName,
      requisitionId: hrmJobRequisitions.id,
      requisitionNumber: hrmJobRequisitions.requisitionNumber,
      requisitionTitle: hrmJobRequisitions.requisitionTitle,
      applicationStage: hrmCandidateApplications.applicationStage,
      appliedAt: hrmCandidateApplications.appliedAt,
      rejectedAt: hrmCandidateApplications.rejectedAt,
    })
    .from(hrmCandidateApplications)
    .innerJoin(
      hrmCandidates,
      and(
        eq(hrmCandidates.orgId, hrmCandidateApplications.orgId),
        eq(hrmCandidates.id, hrmCandidateApplications.candidateId),
      ),
    )
    .innerJoin(
      hrmJobRequisitions,
      and(
        eq(hrmJobRequisitions.orgId, hrmCandidateApplications.orgId),
        eq(hrmJobRequisitions.id, hrmCandidateApplications.requisitionId),
      ),
    )
    .where(
      and(
        eq(hrmCandidateApplications.orgId, orgId),
        eq(hrmCandidateApplications.id, applicationId),
      ),
    );

  if (!row) return null;

  return {
    ...row,
    appliedAt: row.appliedAt ? String(row.appliedAt) : null,
    rejectedAt: row.rejectedAt ? String(row.rejectedAt) : null,
  };
}