import type { DbClient } from "@afenda/db";
import { hrmPositions } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";

export interface PositionListItem {
  positionId: string;
  positionCode: string;
  positionTitle: string;
  legalEntityId: string;
  orgUnitId: string | null;
  jobId: string | null;
  gradeId: string | null;
  positionStatus: string;
  isBudgeted: boolean;
  headcountLimit: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
}

export interface ListPositionsInput {
  orgId: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListPositionsResult {
  items: PositionListItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listPositions(
  db: DbClient,
  input: ListPositionsInput,
): Promise<ListPositionsResult> {
  const limit = Math.min(input.limit ?? 25, 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const filters = [eq(hrmPositions.orgId, input.orgId)];

  if (input.status) {
    filters.push(sql`${hrmPositions.positionStatus} = ${input.status}`);
  }

  if (input.search) {
    const pattern = `%${input.search}%`;
    filters.push(
      sql`(${hrmPositions.positionCode} ilike ${pattern} or ${hrmPositions.positionTitle} ilike ${pattern})`,
    );
  }

  const rows = await db
    .select({
      positionId: hrmPositions.id,
      positionCode: hrmPositions.positionCode,
      positionTitle: hrmPositions.positionTitle,
      legalEntityId: hrmPositions.legalEntityId,
      orgUnitId: hrmPositions.orgUnitId,
      jobId: hrmPositions.jobId,
      gradeId: hrmPositions.gradeId,
      positionStatus: hrmPositions.positionStatus,
      isBudgeted: hrmPositions.isBudgeted,
      headcountLimit: hrmPositions.headcountLimit,
      effectiveFrom: hrmPositions.effectiveFrom,
      effectiveTo: hrmPositions.effectiveTo,
      isCurrent: hrmPositions.isCurrent,
    })
    .from(hrmPositions)
    .where(and(...filters))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ total: sql<number>`count(*)` })
    .from(hrmPositions)
    .where(and(...filters));

  return {
    items: rows.map((row) => ({
      ...row,
      orgUnitId: row.orgUnitId ?? null,
      jobId: row.jobId ?? null,
      gradeId: row.gradeId ?? null,
      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
    })),
    total: Number(countRows[0]?.total ?? 0),
    limit,
    offset,
  };
}