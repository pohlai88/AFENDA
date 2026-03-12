import type { DbClient } from "@afenda/db";
import { arExpectedReceiptProjection } from "@afenda/db";
import { and, asc, eq, lte } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface ArExpectedReceiptProjectionRow {
  id: string;
  orgId: string;
  sourceReceivableId: string;
  customerId: string;
  customerName: string;
  dueDate: string;
  expectedReceiptDate: string;
  currencyCode: string;
  grossAmountMinor: string;
  openAmountMinor: string;
  receiptMethod: string | null;
  status: string;
  sourceVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArExpectedReceiptProjectionListParams {
  status?: "open" | "partially_received" | "fully_received" | "cancelled";
  dueDateLte?: string;
  customerId?: string;
}

export async function listArExpectedReceiptProjections(
  db: DbClient,
  orgId: OrgId,
  params: ArExpectedReceiptProjectionListParams = {},
): Promise<ArExpectedReceiptProjectionRow[]> {
  const conditions = [eq(arExpectedReceiptProjection.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(arExpectedReceiptProjection.status, params.status));
  }

  if (params.dueDateLte) {
    conditions.push(lte(arExpectedReceiptProjection.dueDate, params.dueDateLte));
  }

  if (params.customerId) {
    conditions.push(eq(arExpectedReceiptProjection.customerId, params.customerId));
  }

  const rows = await db
    .select()
    .from(arExpectedReceiptProjection)
    .where(and(...conditions))
    .orderBy(asc(arExpectedReceiptProjection.dueDate), asc(arExpectedReceiptProjection.createdAt));

  return rows.map((r) => ({ ...r }));
}
