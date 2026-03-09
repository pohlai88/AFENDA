/**
 * WHT Certificate read queries — list, getById.
 *
 * RULES:
 *   1. All queries are org-scoped (filter by orgId).
 *   2. Read-only — no mutations.
 */

import type { DbClient } from "@afenda/db";
import { whtCertificate } from "@afenda/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";
import { CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX } from "@afenda/contracts";
import { WhtCertificateStatusValues } from "@afenda/contracts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WhtCertificateRow {
  id: string;
  orgId: string;
  supplierId: string;
  certificateNumber: string;
  whtType: string;
  jurisdictionCode: string;
  currencyCode: string;
  grossAmountMinor: bigint;
  whtRatePercent: string;
  whtAmountMinor: bigint;
  netAmountMinor: bigint;
  taxPeriod: string;
  certificateDate: string;
  paymentRunId: string | null;
  status: string;
  issuedAt: Date | null;
  submittedAt: Date | null;
  taxAuthorityReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhtCertificateListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

// ── Cursor helpers ───────────────────────────────────────────────────────────

function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listWhtCertificates(
  db: DbClient,
  orgId: OrgId,
  params: WhtCertificateListParams = {},
): Promise<{ data: WhtCertificateRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(params.limit ?? CURSOR_LIMIT_DEFAULT, CURSOR_LIMIT_MAX);
  const fetchLimit = limit + 1;

  const conditions = [eq(whtCertificate.orgId, orgId)];
  if (params.status && WhtCertificateStatusValues.includes(params.status as (typeof WhtCertificateStatusValues)[number])) {
    conditions.push(eq(whtCertificate.status, params.status as (typeof WhtCertificateStatusValues)[number]));
  }
  if (params.cursor) {
    conditions.push(gt(whtCertificate.id, decodeCursor(params.cursor)));
  }

  const rows = await db
    .select()
    .from(whtCertificate)
    .where(and(...conditions))
    .orderBy(asc(whtCertificate.id))
    .limit(fetchLimit);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = data[data.length - 1];

  return {
    data: data.map(mapRow),
    cursor: hasMore && lastRow ? encodeCursor(lastRow.id) : null,
    hasMore,
  };
}

export async function getWhtCertificateById(
  db: DbClient,
  orgId: OrgId,
  id: string,
): Promise<WhtCertificateRow | null> {
  const [row] = await db
    .select()
    .from(whtCertificate)
    .where(and(eq(whtCertificate.orgId, orgId), eq(whtCertificate.id, id)))
    .limit(1);

  return row ? mapRow(row) : null;
}

// ── Row mapping ───────────────────────────────────────────────────────────────

function mapRow(row: typeof whtCertificate.$inferSelect): WhtCertificateRow {
  return {
    id: row.id,
    orgId: row.orgId,
    supplierId: row.supplierId,
    certificateNumber: row.certificateNumber,
    whtType: row.whtType,
    jurisdictionCode: row.jurisdictionCode,
    currencyCode: row.currencyCode,
    grossAmountMinor: row.grossAmountMinor,
    whtRatePercent: row.whtRatePercent,
    whtAmountMinor: row.whtAmountMinor,
    netAmountMinor: row.netAmountMinor,
    taxPeriod: row.taxPeriod,
    certificateDate: row.certificateDate,
    paymentRunId: row.paymentRunId,
    status: row.status,
    issuedAt: row.issuedAt,
    submittedAt: row.submittedAt,
    taxAuthorityReference: row.taxAuthorityReference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
