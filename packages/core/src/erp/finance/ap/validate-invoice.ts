/**
 * validateInvoice — orchestrator for duplicate detection + 3-way match + hold creation.
 *
 * Runs after invoice submit. Creates holds when:
 *   - DUPLICATE: detectDuplicates finds this invoice in a duplicate group
 *   - QUANTITY_VARIANCE: threeWayMatch returns QUANTITY_MISMATCH
 *   - PRICE_VARIANCE: threeWayMatch returns OVER_TOLERANCE
 *   - NEEDS_RECEIPT: PO referenced but no receipt found
 */
import type { DbClient } from "@afenda/db";
import {
  invoice,
  purchaseOrder,
  receipt,
  matchTolerance,
} from "@afenda/db";
import { eq, and, inArray } from "drizzle-orm";
import type { InvoiceId, PrincipalId, CorrelationId } from "@afenda/contracts";
import { threeWayMatch } from "./calculators/three-way-match.js";
import {
  detectDuplicates,
  type InvoiceFingerprint,
} from "./calculators/detect-duplicates.js";
import { createHold } from "./hold.service.js";
import type { OrgScopedContext } from "../../../kernel/governance/audit/audit.js";

export interface ValidateInvoiceResult {
  readonly invoiceId: string;
  readonly holdsCreated: number;
  readonly duplicateGroupSize: number;
  readonly matchStatus: string | null;
}

const DEFAULT_TOLERANCE_PERCENT = 1; // 1% default

/**
 * Validate invoice: duplicate detection + 3-way match. Creates holds when needed.
 */
export async function validateInvoice(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: { principalId?: PrincipalId | null },
  correlationId: CorrelationId,
  invoiceId: InvoiceId,
): Promise<ValidateInvoiceResult> {
  const orgId = ctx.activeContext.orgId;
  let holdsCreated = 0;
  let duplicateGroupSize = 0;
  let matchStatus: string | null = null;

  const [inv] = await db
    .select({
      id: invoice.id,
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber,
      amountMinor: invoice.amountMinor,
      currencyCode: invoice.currencyCode,
      poReference: invoice.poReference,
      createdAt: invoice.createdAt,
    })
    .from(invoice)
    .where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, orgId)));

  if (!inv) return { invoiceId, holdsCreated, duplicateGroupSize, matchStatus };

  // ── 1. Duplicate detection ─────────────────────────────────────────────────
  const supplierInvoices = await db
    .select({
      id: invoice.id,
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber,
      amountMinor: invoice.amountMinor,
      createdAt: invoice.createdAt,
    })
    .from(invoice)
    .where(
      and(
        eq(invoice.orgId, orgId),
        eq(invoice.supplierId, inv.supplierId),
        inArray(invoice.status, ["draft", "submitted", "approved", "posted"]),
      ),
    );

  const fingerprints: InvoiceFingerprint[] = supplierInvoices.map((r) => ({
    invoiceId: r.id,
    supplierId: r.supplierId,
    supplierRef: r.invoiceNumber,
    totalAmount: r.amountMinor,
    invoiceDate: r.createdAt,
  }));

  const dupGroups = detectDuplicates(fingerprints);
  const myGroup = dupGroups.find((g) =>
    g.invoices.some((i) => i.invoiceId === invoiceId),
  );

  if (myGroup && myGroup.invoices.length >= 2) {
    duplicateGroupSize = myGroup.invoices.length;
    const holdResult = await createHold(
      db,
      ctx,
      policyCtx,
      correlationId,
      {
        invoiceId,
        holdType: "DUPLICATE",
        holdReason: `Potential duplicate: ${duplicateGroupSize} invoices share fingerprint ${myGroup.fingerprint}`,
      },
    );
    if (holdResult.ok) holdsCreated++;
  }

  // ── 2. 3-way match (if poReference provided) ────────────────────────────────
  if (inv.poReference) {
    const [po] = await db
      .select({
        id: purchaseOrder.id,
        amountMinor: purchaseOrder.amountMinor,
        currencyCode: purchaseOrder.currencyCode,
      })
      .from(purchaseOrder)
      .where(
        and(
          eq(purchaseOrder.orgId, orgId),
          eq(purchaseOrder.poNumber, inv.poReference),
        ),
      );

    if (!po) {
      // PO not found — could create NEEDS_RECEIPT or skip
      matchStatus = "PO_NOT_FOUND";
    } else {
      const [rec] = await db
        .select({
          id: receipt.id,
          amountMinor: receipt.amountMinor,
          currencyCode: receipt.currencyCode,
        })
        .from(receipt)
        .where(
          and(
            eq(receipt.orgId, orgId),
            eq(receipt.purchaseOrderId, po.id),
            inArray(receipt.status, ["draft", "received"]),
          ),
        )
        .limit(1);

      if (!rec) {
        matchStatus = "NEEDS_RECEIPT";
        const holdResult = await createHold(db, ctx, policyCtx, correlationId, {
          invoiceId,
          holdType: "NEEDS_RECEIPT",
          holdReason: `PO ${inv.poReference} has no received receipt yet`,
        });
        if (holdResult.ok) holdsCreated++;
      } else {
        // Get tolerance (org-level default, first active ORG rule)
        const [tol] = await db
          .select({ tolerancePercent: matchTolerance.tolerancePercent })
          .from(matchTolerance)
          .where(
            and(
              eq(matchTolerance.orgId, orgId),
              eq(matchTolerance.scope, "ORG"),
              eq(matchTolerance.isActive, 1),
            ),
          )
          .limit(1);

        const tolerancePercent =
          tol != null ? Number(tol.tolerancePercent) : DEFAULT_TOLERANCE_PERCENT;

        const result = threeWayMatch({
          poAmount: po.amountMinor,
          receiptAmount: rec.amountMinor,
          invoiceAmount: inv.amountMinor,
          tolerancePercent,
        });

        matchStatus = result.status;

        if (result.status === "QUANTITY_MISMATCH") {
          const holdResult = await createHold(db, ctx, policyCtx, correlationId, {
            invoiceId,
            holdType: "QUANTITY_VARIANCE",
            holdReason: `PO amount ${po.amountMinor} ≠ receipt amount ${rec.amountMinor}`,
          });
          if (holdResult.ok) holdsCreated++;
        } else if (result.status === "OVER_TOLERANCE") {
          const holdResult = await createHold(db, ctx, policyCtx, correlationId, {
            invoiceId,
            holdType: "PRICE_VARIANCE",
            holdReason: `Invoice-receipt variance ${result.variancePercent.toFixed(2)}% exceeds tolerance ${tolerancePercent}%`,
          });
          if (holdResult.ok) holdsCreated++;
        }
      }
    }
  }

  return {
    invoiceId,
    holdsCreated,
    duplicateGroupSize,
    matchStatus,
  };
}
