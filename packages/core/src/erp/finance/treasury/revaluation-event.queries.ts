import type { DbClient } from "@afenda/db";
import { revaluationEvent } from "@afenda/db";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface RevaluationEventRow {
  id: string;
  orgId: string;
  fxExposureId: string;
  hedgeDesignationId: string | null;
  valuationDate: string;
  priorRateSnapshotId: string | null;
  currentRateSnapshotId: string;
  carryingAmountMinor: string;
  revaluedAmountMinor: string;
  revaluationDeltaMinor: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetRevaluationEventParams {
  id: string;
}

export interface ListRevaluationEventsParams {
  fxExposureId?: string;
  status?: string;
  valuationDateFrom?: string;
  valuationDateTo?: string;
}

export async function getRevaluationEventById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<RevaluationEventRow | null> {
  const [row] = await db
    .select()
    .from(revaluationEvent)
    .where(and(eq(revaluationEvent.orgId, orgId), eq(revaluationEvent.id, id)));

  return row || null;
}

export async function listRevaluationEvents(
  db: DbClient,
  orgId: OrgId,
  params: ListRevaluationEventsParams = {},
): Promise<RevaluationEventRow[]> {
  const conditions = [eq(revaluationEvent.orgId, orgId)];

  if (params.fxExposureId) {
    conditions.push(eq(revaluationEvent.fxExposureId, params.fxExposureId));
  }

  if (params.status) {
    conditions.push(eq(revaluationEvent.status, params.status));
  }

  if (params.valuationDateFrom) {
    conditions.push(gte(revaluationEvent.valuationDate, params.valuationDateFrom));
  }

  if (params.valuationDateTo) {
    conditions.push(lte(revaluationEvent.valuationDate, params.valuationDateTo));
  }

  const rows = await db
    .select()
    .from(revaluationEvent)
    .where(and(...conditions))
    .orderBy(desc(revaluationEvent.valuationDate), asc(revaluationEvent.createdAt));

  return rows;
}

export async function listRevaluationEventsByFxExposure(
  db: DbClient,
  orgId: OrgId,
  fxExposureId: string,
): Promise<RevaluationEventRow[]> {
  const rows = await db
    .select()
    .from(revaluationEvent)
    .where(and(eq(revaluationEvent.orgId, orgId), eq(revaluationEvent.fxExposureId, fxExposureId)))
    .orderBy(desc(revaluationEvent.valuationDate));

  return rows;
}
