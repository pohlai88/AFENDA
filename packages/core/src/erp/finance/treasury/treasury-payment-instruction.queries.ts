import type { DbClient } from "@afenda/db";
import { treasuryPaymentInstruction } from "@afenda/db";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX, type OrgId } from "@afenda/contracts";

export interface PaymentInstructionRow {
  id: string;
  orgId: string;
  sourceBankAccountId: string;
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryBankCode: string | null;
  amountMinor: string;
  currencyCode: string;
  paymentMethod: string;
  reference: string | null;
  requestedExecutionDate: string;
  status: string;
  createdByPrincipalId: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInstructionListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

export async function listPaymentInstructions(
  db: DbClient,
  orgId: OrgId,
  params: PaymentInstructionListParams = {},
): Promise<{ data: PaymentInstructionRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(treasuryPaymentInstruction.orgId, orgId)];

  if (params.status) {
    conditions.push(
      eq(
        treasuryPaymentInstruction.status,
        params.status as "pending" | "processing" | "settled" | "rejected" | "cancelled",
      ),
    );
  }

  if (params.cursor) {
    conditions.push(gt(treasuryPaymentInstruction.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(treasuryPaymentInstruction)
    .where(and(...conditions))
    .orderBy(asc(treasuryPaymentInstruction.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map((r) => ({ ...r })),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getPaymentInstructionById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<PaymentInstructionRow | null> {
  const [row] = await db
    .select()
    .from(treasuryPaymentInstruction)
    .where(and(eq(treasuryPaymentInstruction.orgId, orgId), eq(treasuryPaymentInstruction.id, id)));

  return row ?? null;
}

export async function getPaymentInstructionsByIds(
  db: DbClient,
  orgId: OrgId,
  ids: string[],
): Promise<PaymentInstructionRow[]> {
  if (ids.length === 0) return [];

  const rows = await db
    .select()
    .from(treasuryPaymentInstruction)
    .where(
      and(eq(treasuryPaymentInstruction.orgId, orgId), inArray(treasuryPaymentInstruction.id, ids)),
    );

  return rows.map((r) => ({ ...r }));
}
