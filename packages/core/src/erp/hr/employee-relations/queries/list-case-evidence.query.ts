import type { DbClient } from "@afenda/db";
import { hrmHrCaseEvidence } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListCaseEvidenceParams {
  orgId: string;
  caseType: "grievance" | "disciplinary";
  caseId: string;
}

export interface CaseEvidenceView {
  id: string;
  caseType: string;
  caseId: string;
  evidenceType: string;
  fileReference: string | null;
  recordedAt: string;
}

export async function listCaseEvidence(
  db: DbClient,
  params: ListCaseEvidenceParams,
): Promise<CaseEvidenceView[]> {
  const rows = await db
    .select()
    .from(hrmHrCaseEvidence)
    .where(
      and(
        eq(hrmHrCaseEvidence.orgId, params.orgId),
        eq(hrmHrCaseEvidence.caseType, params.caseType),
        eq(hrmHrCaseEvidence.caseId, params.caseId),
      ),
    )
    .orderBy(desc(hrmHrCaseEvidence.recordedAt));

  return rows.map((r) => ({
    id: r.id,
    caseType: r.caseType,
    caseId: r.caseId,
    evidenceType: r.evidenceType,
    fileReference: r.fileReference,
    recordedAt: r.recordedAt.toISOString(),
  }));
}
