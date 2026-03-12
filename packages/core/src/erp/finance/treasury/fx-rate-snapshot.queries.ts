import type { DbClient } from "@afenda/db";
import { fxRateSnapshot } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface FxRateSnapshotRow {
  id: string;
  orgId: string;
  rateDate: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rateScaled: string;
  scale: number;
  providerCode: string;
  sourceVersion: string;
  createdAt: Date;
}

export interface FxRateSnapshotListParams {
  rateDate?: string;
  fromCurrencyCode?: string;
  toCurrencyCode?: string;
  sourceVersion?: string;
}

export async function listFxRateSnapshots(
  db: DbClient,
  orgId: OrgId,
  params: FxRateSnapshotListParams = {},
): Promise<FxRateSnapshotRow[]> {
  const conditions = [eq(fxRateSnapshot.orgId, orgId)];

  if (params.rateDate) {
    conditions.push(eq(fxRateSnapshot.rateDate, params.rateDate));
  }

  if (params.fromCurrencyCode) {
    conditions.push(eq(fxRateSnapshot.fromCurrencyCode, params.fromCurrencyCode));
  }

  if (params.toCurrencyCode) {
    conditions.push(eq(fxRateSnapshot.toCurrencyCode, params.toCurrencyCode));
  }

  if (params.sourceVersion) {
    conditions.push(eq(fxRateSnapshot.sourceVersion, params.sourceVersion));
  }

  const rows = await db
    .select()
    .from(fxRateSnapshot)
    .where(and(...conditions))
    .orderBy(
      asc(fxRateSnapshot.rateDate),
      asc(fxRateSnapshot.fromCurrencyCode),
      asc(fxRateSnapshot.toCurrencyCode),
      asc(fxRateSnapshot.createdAt),
    );

  return rows.map((row) => ({ ...row }));
}
