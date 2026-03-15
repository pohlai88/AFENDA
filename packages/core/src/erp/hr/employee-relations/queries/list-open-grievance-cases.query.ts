import type { DbClient } from "@afenda/db";
import { hrmGrievanceCases } from "@afenda/db";
import { and, desc, eq, inArray } from "drizzle-orm";

export interface ListOpenGrievanceCasesParams {
  orgId: string;
}

export interface GrievanceCaseView {
  id: string;
  employmentId: string;
  caseType: string;
  openedAt: string;
  status: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

export async function listOpenGrievanceCases(
  db: DbClient,
  params: ListOpenGrievanceCasesParams,
): Promise<GrievanceCaseView[]> {
  const rows = await db
    .select()
    .from(hrmGrievanceCases)
    .where(
      and(
        eq(hrmGrievanceCases.orgId, params.orgId),
        inArray(hrmGrievanceCases.status, ["open", "investigating"]),
      ),
    )
    .orderBy(desc(hrmGrievanceCases.openedAt));

  return rows.map((r) => ({
    id: r.id,
    employmentId: r.employmentId,
    caseType: r.caseType,
    openedAt: r.openedAt.toISOString(),
    status: r.status,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    resolutionNotes: r.resolutionNotes,
  }));
}
