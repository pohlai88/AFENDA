import type { DbClient } from "@afenda/db";
import { apDuePaymentProjection } from "@afenda/db";
import { and, asc, eq, lte } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";

export interface ApDuePaymentProjectionRow {
  id: string;
  orgId: string;
  sourcePayableId: string;
  supplierId: string;
  supplierName: string;
  paymentTermCode: string | null;
  dueDate: string;
  expectedPaymentDate: string;
  currencyCode: string;
  grossAmountMinor: string;
  openAmountMinor: string;
  paymentMethod: string | null;
  status: string;
  sourceVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApDuePaymentProjectionListParams {
  status?: "open" | "partially_paid" | "fully_paid" | "cancelled";
  dueDateLte?: string;
  supplierId?: string;
}

export async function listApDuePaymentProjections(
  db: DbClient,
  orgId: OrgId,
  params: ApDuePaymentProjectionListParams = {},
): Promise<ApDuePaymentProjectionRow[]> {
  const conditions = [eq(apDuePaymentProjection.orgId, orgId)];

  if (params.status) {
    conditions.push(eq(apDuePaymentProjection.status, params.status));
  }

  if (params.dueDateLte) {
    conditions.push(lte(apDuePaymentProjection.dueDate, params.dueDateLte));
  }

  if (params.supplierId) {
    conditions.push(eq(apDuePaymentProjection.supplierId, params.supplierId));
  }

  const rows = await db
    .select()
    .from(apDuePaymentProjection)
    .where(and(...conditions))
    .orderBy(asc(apDuePaymentProjection.dueDate), asc(apDuePaymentProjection.createdAt));

  return rows.map((r) => ({ ...r }));
}
