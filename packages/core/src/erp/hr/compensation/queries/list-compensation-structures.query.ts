import type { DbClient } from "@afenda/db";
import { hrmCompensationStructures } from "@afenda/db";
import { eq } from "drizzle-orm";

export async function listCompensationStructures(
  db: DbClient,
  orgId: string,
  params?: { limit?: number; offset?: number },
) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  const rows = await db
    .select({
      id: hrmCompensationStructures.id,
      structureCode: hrmCompensationStructures.structureCode,
      structureName: hrmCompensationStructures.structureName,
      payBasis: hrmCompensationStructures.payBasis,
      currencyCode: hrmCompensationStructures.currencyCode,
      minAmount: hrmCompensationStructures.minAmount,
      maxAmount: hrmCompensationStructures.maxAmount,
      createdAt: hrmCompensationStructures.createdAt,
    })
    .from(hrmCompensationStructures)
    .where(eq(hrmCompensationStructures.orgId, orgId))
    .limit(limit)
    .offset(offset);

  return { data: rows, limit, offset, total: rows.length };
}
