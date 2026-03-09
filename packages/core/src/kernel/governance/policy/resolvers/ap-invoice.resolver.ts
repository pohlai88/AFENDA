/**
 * AP Invoice capability resolver — maps existing SoD rules + permission
 * checks into the normalised CapabilityResult contract.
 *
 * Self-registers on import.
 *
 * FIELD CAPABILITY RULES:
 *   - ID fields (id, orgId, createdAt, updatedAt) → always "ro"
 *   - Status field → "ro" (driven by flow transitions, not direct edit)
 *   - Editable fields (invoiceNumber, amount, etc.) → "rw" if principal
 *     has submit permission, "ro" otherwise
 *   - Submitted/paid metadata fields → "ro"
 *
 * ACTION CAPABILITY RULES:
 *   - Delegates to existing SoD functions: canApproveInvoice(), canPostToGL(), canMarkPaid()
 *   - Submit: requires ap.invoice.submit permission
 *   - Approve/Reject: SoD (submitter ≠ approver) + ap.invoice.approve permission
 *   - Post: requires gl.journal.post permission
 *   - MarkPaid: requires ap.invoice.markpaid permission
 *   - Void: requires ap.invoice.approve permission (same as approve for now)
 */
import { Permissions } from "@afenda/contracts";
import type { FieldCap, ActionCap, PolicyContext } from "@afenda/contracts";
import { hasPermission } from "../../../identity/permissions.js";
import { canApproveInvoice, canPostToGL, canMarkPaid } from "../sod-rules.js";
import {
  registerCapabilityResolver,
  type EntityCapabilityResolver,
  type RecordContext,
} from "../capability-engine.js";

// ── Helper: convert PolicyResult → ActionCap ─────────────────────────────────

function policyToActionCap(result: { allowed: true } | { allowed: false; code: string; reason: string }): ActionCap {
  if (result.allowed) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: { code: result.code, message: result.reason },
  };
}

// ── Field keys ───────────────────────────────────────────────────────────────

/** All field keys for finance.ap_invoice (must match entity registration). */
const ALWAYS_RO_FIELDS = new Set([
  "id",
  "orgId",
  "status",
  "submittedByPrincipalId",
  "submittedAt",
  "paidAt",
  "paidByPrincipalId",
  "paymentReference",
  "createdAt",
  "updatedAt",
]);

const EDITABLE_FIELDS = [
  "supplierId",
  "invoiceNumber",
  "amountMinor",
  "currencyCode",
  "dueDate",
  "poReference",
];

// ── Resolver ─────────────────────────────────────────────────────────────────

const apInvoiceResolver: EntityCapabilityResolver = {
  entityKey: "finance.ap_invoice",

  resolveFieldCaps(ctx: PolicyContext, _record?: RecordContext): Record<string, FieldCap> {
    const canEdit = hasPermission(ctx, Permissions.apInvoiceSubmit);
    const editCap: FieldCap = canEdit ? "rw" : "ro";

    const caps: Record<string, FieldCap> = {};

    // Always read-only fields
    for (const key of ALWAYS_RO_FIELDS) {
      caps[key] = "ro";
    }

    // Editable fields — "rw" only if principal has submit permission
    for (const key of EDITABLE_FIELDS) {
      caps[key] = editCap;
    }

    return caps;
  },

  resolveActionCaps(ctx: PolicyContext, record?: RecordContext): Record<string, ActionCap> {
    const submittedBy = record?.["submittedByPrincipalId"] as string | undefined;
    const caps: Record<string, ActionCap> = {};

    // Submit
    caps["invoice.submit"] = hasPermission(ctx, Permissions.apInvoiceSubmit)
      ? { allowed: true }
      : { allowed: false, reason: { code: "MISSING_PERMISSION", message: "Missing ap.invoice.submit permission" } };

    // Approve — SoD: submitter ≠ approver
    caps["invoice.approve"] = policyToActionCap(canApproveInvoice(ctx, submittedBy as never));

    // Reject — same permission as approve (no SoD needed for rejection)
    caps["invoice.reject"] = hasPermission(ctx, Permissions.apInvoiceApprove)
      ? { allowed: true }
      : { allowed: false, reason: { code: "MISSING_PERMISSION", message: "Missing ap.invoice.approve permission" } };

    // Post to GL
    caps["invoice.post"] = policyToActionCap(canPostToGL(ctx));

    // Mark Paid
    caps["invoice.markPaid"] = policyToActionCap(canMarkPaid(ctx));

    // Void — requires approve permission
    caps["invoice.void"] = hasPermission(ctx, Permissions.apInvoiceApprove)
      ? { allowed: true }
      : { allowed: false, reason: { code: "MISSING_PERMISSION", message: "Missing ap.invoice.approve permission" } };

    // View evidence (read-only action)
    caps["invoice.viewEvidence"] = { allowed: true };

    return caps;
  },
};

// ── Self-register ────────────────────────────────────────────────────────────
registerCapabilityResolver(apInvoiceResolver);
