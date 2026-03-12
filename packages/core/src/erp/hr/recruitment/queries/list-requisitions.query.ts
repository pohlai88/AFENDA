import type { DbClient } from "@afenda/db";
import { hrmJobRequisitions } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";

export interface RequisitionListItem {
  requisitionId: string;
  requisitionNumber: string;
  requisitionTitle: string;
  legalEntityId: string;
  orgUnitId: string | null;
  positionId: string | null;
  hiringManagerEmployeeId: string | null;
  requestedHeadcount: string;
  requestedStartDate: string | null;
  status: string;
}

export interface ListRequisitionsInput {
  orgId: string;
  requisitionId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListRequisitionsResult {
  items: RequisitionListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listRequisitions(
  db: DbClient,
  input: ListRequisitionsInput,
): Promise<ListRequisitionsResult> {
  const limit = Math.min(input.limit ?? 25, 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const filters = [eq(hrmJobRequisitions.orgId, input.orgId)];

  if (input.requisitionId) {
    filters.push(eq(hrmJobRequisitions.id, input.requisitionId));
  }

  if (input.status) {
    filters.push(sql`${hrmJobRequisitions.status} = ${input.status}`);
  }

  const rows = await db
    .select({
      requisitionId: hrmJobRequisitions.id,
      requisitionNumber: hrmJobRequisitions.requisitionNumber,
      requisitionTitle: hrmJobRequisitions.requisitionTitle,
      legalEntityId: hrmJobRequisitions.legalEntityId,
      orgUnitId: hrmJobRequisitions.orgUnitId,
      positionId: hrmJobRequisitions.positionId,
      hiringManagerEmployeeId: hrmJobRequisitions.hiringManagerEmployeeId,
      requestedHeadcount: hrmJobRequisitions.requestedHeadcount,
      requestedStartDate: hrmJobRequisitions.requestedStartDate,
      status: hrmJobRequisitions.status,
    })
    .from(hrmJobRequisitions)
    .where(and(...filters))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(hrmJobRequisitions)
    .where(and(...filters));

  return {
    items: rows.map((row) => ({
      ...row,
      orgUnitId: row.orgUnitId ?? null,
      positionId: row.positionId ?? null,
      hiringManagerEmployeeId: row.hiringManagerEmployeeId ?? null,
      requestedStartDate: row.requestedStartDate ? String(row.requestedStartDate) : null,
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}