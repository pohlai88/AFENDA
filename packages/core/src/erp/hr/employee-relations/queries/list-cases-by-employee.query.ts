import type { DbClient } from "@afenda/db";
import {
  hrmDisciplinaryActions,
  hrmGrievanceCases,
} from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListCasesByEmployeeParams {
  orgId: string;
  employmentId: string;
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

export interface DisciplinaryActionView {
  id: string;
  employmentId: string;
  actionType: string;
  effectiveDate: string;
  status: string;
  notes: string | null;
}

export async function listCasesByEmployee(
  db: DbClient,
  params: ListCasesByEmployeeParams,
): Promise<{
  grievanceCases: GrievanceCaseView[];
  disciplinaryActions: DisciplinaryActionView[];
}> {
  const [grievanceRows, disciplinaryRows] = await Promise.all([
    db
      .select()
      .from(hrmGrievanceCases)
      .where(
        and(
          eq(hrmGrievanceCases.orgId, params.orgId),
          eq(hrmGrievanceCases.employmentId, params.employmentId),
        ),
      )
      .orderBy(desc(hrmGrievanceCases.openedAt)),
    db
      .select()
      .from(hrmDisciplinaryActions)
      .where(
        and(
          eq(hrmDisciplinaryActions.orgId, params.orgId),
          eq(hrmDisciplinaryActions.employmentId, params.employmentId),
        ),
      )
      .orderBy(desc(hrmDisciplinaryActions.effectiveDate)),
  ]);

  return {
    grievanceCases: grievanceRows.map((r) => ({
      id: r.id,
      employmentId: r.employmentId,
      caseType: r.caseType,
      openedAt: r.openedAt.toISOString(),
      status: r.status,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      resolutionNotes: r.resolutionNotes,
    })),
    disciplinaryActions: disciplinaryRows.map((r) => ({
      id: r.id,
      employmentId: r.employmentId,
      actionType: r.actionType,
      effectiveDate: r.effectiveDate,
      status: r.status,
      notes: r.notes,
    })),
  };
}
