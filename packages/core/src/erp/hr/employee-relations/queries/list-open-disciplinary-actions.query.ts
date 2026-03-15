import type { DbClient } from "@afenda/db";
import { hrmDisciplinaryActions } from "@afenda/db";
import { and, desc, eq, inArray } from "drizzle-orm";

export interface ListOpenDisciplinaryActionsParams {
  orgId: string;
}

export interface DisciplinaryActionView {
  id: string;
  employmentId: string;
  actionType: string;
  effectiveDate: string;
  status: string;
  notes: string | null;
}

export async function listOpenDisciplinaryActions(
  db: DbClient,
  params: ListOpenDisciplinaryActionsParams,
): Promise<DisciplinaryActionView[]> {
  const rows = await db
    .select()
    .from(hrmDisciplinaryActions)
    .where(
      and(
        eq(hrmDisciplinaryActions.orgId, params.orgId),
        inArray(hrmDisciplinaryActions.status, ["draft", "active"]),
      ),
    )
    .orderBy(desc(hrmDisciplinaryActions.effectiveDate));

  return rows.map((r) => ({
    id: r.id,
    employmentId: r.employmentId,
    actionType: r.actionType,
    effectiveDate: r.effectiveDate,
    status: r.status,
    notes: r.notes,
  }));
}
