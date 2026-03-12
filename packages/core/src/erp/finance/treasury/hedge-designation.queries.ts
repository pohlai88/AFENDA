import type { DbClient } from "@afenda/db";
import { treasuryHedgeDesignationTable } from "@afenda/db";
import { and, asc, eq } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface HedgeDesignationRow {
  id: string;
  orgId: string;
  fxExposureId: string;
  hedgeNumber: string;
  hedgeInstrumentType: string;
  hedgeRelationshipType: string;
  designatedAmountMinor: string;
  status: string;
  startDate: string;
  endDate: string | null;
  designationMemo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetHedgeDesignationParams {
  id: string;
}

export interface ListHedgeDesignationsParams {
  fxExposureId?: string;
  status?: string;
  hedgeInstrumentType?: string;
  hedgeRelationshipType?: string;
}

export async function getHedgeDesignationById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<HedgeDesignationRow | null> {
  const [row] = await db
    .select()
    .from(treasuryHedgeDesignationTable)
    .where(
      and(eq(treasuryHedgeDesignationTable.orgId, orgId), eq(treasuryHedgeDesignationTable.id, id)),
    );

  return row || null;
}

export async function listHedgeDesignations(
  db: DbClient,
  orgId: OrgId,
  params: ListHedgeDesignationsParams = {},
): Promise<HedgeDesignationRow[]> {
  const conditions = [eq(treasuryHedgeDesignationTable.orgId, orgId)];

  if (params.fxExposureId) {
    conditions.push(eq(treasuryHedgeDesignationTable.fxExposureId, params.fxExposureId));
  }

  if (params.status) {
    conditions.push(eq(treasuryHedgeDesignationTable.status, params.status));
  }

  if (params.hedgeInstrumentType) {
    conditions.push(
      eq(treasuryHedgeDesignationTable.hedgeInstrumentType, params.hedgeInstrumentType),
    );
  }

  if (params.hedgeRelationshipType) {
    conditions.push(
      eq(treasuryHedgeDesignationTable.hedgeRelationshipType, params.hedgeRelationshipType),
    );
  }

  const rows = await db
    .select()
    .from(treasuryHedgeDesignationTable)
    .where(and(...conditions))
    .orderBy(
      asc(treasuryHedgeDesignationTable.createdAt),
      asc(treasuryHedgeDesignationTable.hedgeNumber),
    );

  return rows;
}
