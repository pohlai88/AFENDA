/**
 * @afenda/contracts — Canonical permission keys.
 *
 * RULES:
 *   1. Format: `scope.entity.action` (lowercase dot-separated).
 *   2. Every permission used in SoD checks or route guards MUST be listed here.
 *   3. The DB seed script uses these values — keep in sync.
 *   4. Adding a permission is safe. Removing/renaming is BREAKING.
 *   5. No Zod — pure vocabulary, importable by db (*Values pattern).
 */

// ── Permission keys ───────────────────────────────────────────────────────────

export const PermissionValues = [
  // IAM
  "iam.principal.read",
  "iam.role.read",
  "iam.role.write",
  "iam.permission.read",

  // AP (Invoices)
  "ap.invoice.submit",
  "ap.invoice.approve",
  "ap.invoice.reject",
  "ap.invoice.void",
  "ap.invoice.markpaid",
  "ap.invoice.read",

  // AP (Payment Terms)
  "ap.payment-terms.read",
  "ap.payment-terms.write",

  // AP (Holds)
  "ap.hold.create",
  "ap.hold.release",
  "ap.hold.read",

  // AP (Invoice Lines)
  "ap.invoice-line.read",
  "ap.invoice-line.write",

  // AP (Payment Runs)
  "ap.payment-run.read",
  "ap.payment-run.create",
  "ap.payment-run.update",
  "ap.payment-run.approve",
  "ap.payment-run.execute",
  "ap.payment-run.cancel",
  "ap.payment-run.reverse",

  // AP (Payment Run Items)
  "ap.payment-run-item.read",
  "ap.payment-run-item.add",
  "ap.payment-run-item.update",
  "ap.payment-run-item.remove",

  // GL (General Ledger)
  "gl.account.read",
  "gl.journal.post",
  "gl.journal.reverse",
  "gl.journal.read",

  // Purchasing (PO, receipt)
  "purch.purchase-order.read",
  "purch.purchase-order.create",
  "purch.receipt.read",
  "purch.receipt.create",

  // Supplier
  "sup.supplier.read",
  "sup.supplier.create",

  // Supplier Sites
  "sup.site.read",
  "sup.site.write",

  // Supplier Bank Accounts
  "sup.bank-account.read",
  "sup.bank-account.write",
  "sup.bank-account.verify",

  // Document / Evidence
  "doc.document.read",
  "doc.evidence.attach",

  // Audit
  "audit.log.read",

  // Admin
  "admin.org.manage",

  // Settings
  "admin.settings.read",
  "admin.settings.write",

  // Custom Fields (definition management — kernel/governance)
  "admin.custom-fields.read",
  "admin.custom-fields.write",
] as const;

export type Permission = (typeof PermissionValues)[number];

// ── Grouped by scope (convenience for UI rendering) ───────────────────────────

export const PERMISSION_SCOPES = {
  iam: PermissionValues.filter((p) => p.startsWith("iam.")),
  ap: PermissionValues.filter((p) => p.startsWith("ap.")),
  gl: PermissionValues.filter((p) => p.startsWith("gl.")),
  purch: PermissionValues.filter((p) => p.startsWith("purch.")),
  sup: PermissionValues.filter((p) => p.startsWith("sup.")),
  doc: PermissionValues.filter((p) => p.startsWith("doc.")),
  audit: PermissionValues.filter((p) => p.startsWith("audit.")),
  admin: PermissionValues.filter((p) => p.startsWith("admin.")),
} as const;
