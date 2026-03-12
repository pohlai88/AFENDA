import type { DbClient } from "@afenda/db";
import { treasuryFxExposureTable } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface FxExposureRow {
  id: string;
  orgId: string;
  exposureNumber: string;
  exposureDate: string;
  valueDate: string;
  sourceType: string;
  sourceId: string;
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  direction: string;
  grossAmountMinor: string;
  status: string;
  sourceVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetFxExposureParams {
  id: string;
}

export interface ListFxExposuresParams {
  status?: string;
  sourceType?: string;
  baseCurrencyCode?: string;
  quoteCurrencyCode?: string;
}

export async function getFxExposureById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<FxExposureRow | null> {
  const [row] = await db
    .select()
    .from(treasuryFxExposureTable)
    .where(and(eq(treasuryFxExposureTable.orgId, orgId), eq(treasuryFxExposureTable.id, id)));

  return row || null;
}

export async function listFxExposures(
  db: DbClient,
  orgId: OrgId,
  params: ListFxExposuresParams = {},
): Promise<FxExposureRow[]> {
  const conditions = [eq(treasuryFxExposureTable.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(treasuryFxExposureTable.status, params.status));
  }

  if (params.sourceType) {
    conditions.push(eq(treasuryFxExposureTable.sourceType, params.sourceType));
  }

  if (params.baseCurrencyCode) {
    conditions.push(eq(treasuryFxExposureTable.baseCurrencyCode, params.baseCurrencyCode));
  }

  if (params.quoteCurrencyCode) {
    conditions.push(eq(treasuryFxExposureTable.quoteCurrencyCode, params.quoteCurrencyCode));
  }

  const rows = await db
    .select()
    .from(treasuryFxExposureTable)
    .where(and(...conditions))
    .orderBy(asc(treasuryFxExposureTable.createdAt), asc(treasuryFxExposureTable.exposureNumber));

  return rows;
}
