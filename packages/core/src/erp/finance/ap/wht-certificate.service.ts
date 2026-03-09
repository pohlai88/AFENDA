/**
 * WHT Certificate service — create certificate.
 *
 * Every mutation:
 *   1. Runs inside `withAudit()` — domain write + audit log are atomic.
 *   2. Emits an outbox event inside the same transaction.
 *
 * RULES:
 *   - No HTTP/Fastify imports — pure domain service.
 *   - Error codes: AP_WHT_CERTIFICATE_* from @afenda/contracts.
 */

import type { DbClient } from "@afenda/db";
import { whtCertificate, supplier, outboxEvent } from "@afenda/db";
import { eq, and } from "drizzle-orm";
import type {
  OrgId,
  PrincipalId,
  CorrelationId,
  WhtCertificateId,
  EntityId,
} from "@afenda/contracts";
import { withAudit, type OrgScopedContext } from "../../../kernel/governance/audit/audit.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type WhtCertificateServiceError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type WhtCertificateServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: WhtCertificateServiceError };

export interface CreateWhtCertificateParams {
  supplierId: string;
  certificateNumber: string;
  whtType: "SERVICES" | "RENT" | "ROYALTIES" | "INTEREST" | "DIVIDENDS" | "OTHER";
  jurisdictionCode: string;
  currencyCode: string;
  grossAmountMinor: bigint;
  whtRatePercent: number;
  whtAmountMinor: bigint;
  netAmountMinor: bigint;
  taxPeriod: string;
  certificateDate: string; // YYYY-MM-DD
  paymentRunId?: string | null;
}

// ── Create WHT Certificate ───────────────────────────────────────────────────

export async function createWhtCertificate(
  db: DbClient,
  ctx: OrgScopedContext,
  _policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  params: CreateWhtCertificateParams,
): Promise<WhtCertificateServiceResult<{ id: WhtCertificateId }>> {
  const orgId = ctx.activeContext.orgId;

  // Validate supplier exists
  const [sup] = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.orgId, orgId), eq(supplier.id, params.supplierId)))
    .limit(1);

  if (!sup) {
    return {
      ok: false,
      error: {
        code: "SUP_SUPPLIER_NOT_FOUND",
        message: "Supplier not found",
        meta: { supplierId: params.supplierId },
      },
    };
  }

  // Check certificate number uniqueness
  const [existing] = await db
    .select({ id: whtCertificate.id })
    .from(whtCertificate)
    .where(
      and(
        eq(whtCertificate.orgId, orgId),
        eq(whtCertificate.certificateNumber, params.certificateNumber),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      ok: false,
      error: {
        code: "AP_WHT_CERTIFICATE_NUMBER_EXISTS",
        message: `WHT certificate number '${params.certificateNumber}' already exists`,
        meta: { certificateNumber: params.certificateNumber },
      },
    };
  }

  const certDateStr =
    typeof params.certificateDate === "string"
      ? params.certificateDate.slice(0, 10)
      : String(params.certificateDate).slice(0, 10);

  const auditEntry = {
    actorPrincipalId: _policyCtx.principalId ?? null,
    action: "wht-certificate.created" as const,
    entityType: "wht_certificate" as const,
    entityId: undefined as EntityId | undefined,
    correlationId,
    details: {
      certificateNumber: params.certificateNumber,
      supplierId: params.supplierId,
      whtType: params.whtType,
    },
  };

  const result = await withAudit(db, ctx, auditEntry, async (tx) => {
    const [row] = await tx
      .insert(whtCertificate)
      .values({
        orgId,
        supplierId: params.supplierId,
        certificateNumber: params.certificateNumber,
        whtType: params.whtType,
        jurisdictionCode: params.jurisdictionCode,
        currencyCode: params.currencyCode,
        grossAmountMinor: params.grossAmountMinor,
        whtRatePercent: String(params.whtRatePercent),
        whtAmountMinor: params.whtAmountMinor,
        netAmountMinor: params.netAmountMinor,
        taxPeriod: params.taxPeriod,
        certificateDate: certDateStr,
        paymentRunId: params.paymentRunId ?? null,
        status: "DRAFT",
      })
      .returning({ id: whtCertificate.id });

    if (!row) throw new Error("Failed to insert WHT certificate");

    auditEntry.entityId = row.id as unknown as EntityId;

    await tx.insert(outboxEvent).values({
      orgId,
      type: "AP.WHT_CERTIFICATE_CREATED",
      version: "1",
      correlationId,
      payload: {
        whtCertificateId: row.id,
        supplierId: params.supplierId,
        certificateNumber: params.certificateNumber,
      },
    });

    return { id: row.id as WhtCertificateId };
  });

  return { ok: true, data: result };
}
