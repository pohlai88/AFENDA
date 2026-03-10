/**
 * Supplier portal interactions — Class C projections.
 *
 * Routes portal user actions to canonical domain commands.
 * Every interaction requires PolicyContext for authorization.
 *
 * RULES:
 *   - Delegate to existing AP service functions — never mutate tables directly
 *   - PolicyContext is passed through to domain services
 *   - Return typed ProjectionResult (not ProjectionEnvelope — mutations don't wrap)
 */

import type { DbClient } from "@afenda/db";
import type { CorrelationId, SupplierId, InvoiceId } from "@afenda/contracts";
import type { PolicyContext } from "@afenda/contracts";
import type { OrgScopedContext } from "../../../kernel/governance/audit/audit.js";
import { submitInvoice } from "../../../erp/finance/ap/index.js";
import type { ProjectionResult } from "../../shared/projection-types.js";
import type { SubmitInvoiceInput, SubmitInvoiceOutput } from "../types/view-models.js";

/**
 * Submit an invoice through the supplier portal.
 * Class C interaction — routes to AP submitInvoice command.
 *
 * This creates a new invoice in "submitted" status (skipping draft).
 * The domain service handles validation, hold detection, and audit logging.
 */
export async function submitInvoiceFromPortal(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  input: SubmitInvoiceInput,
): Promise<ProjectionResult<SubmitInvoiceOutput>> {
  const result = await submitInvoice(db, ctx, policyCtx, correlationId, {
    supplierId: input.supplierId as SupplierId,
    amountMinor: input.amountMinor,
    currencyCode: input.currencyCode,
    dueDate: input.dueDate,
    poReference: input.poReference,
    idempotencyKey: input.idempotencyKey,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: {
        code: result.error.code,
        message: result.error.message,
        meta: result.error.meta,
      },
    };
  }

  return {
    ok: true,
    data: {
      invoiceId: result.data.id as string,
      invoiceNumber: result.data.invoiceNumber,
    },
  };
}
