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

  // Treasury
  "treas.bank-account.read",
  "treas.bank-account.create",
  "treas.bank-account.update",
  "treas.bank-account.activate",
  "treas.bank-account.deactivate",
  "treas.bank-statement.read",
  "treas.bank-statement.ingest",
  "treas.reconciliation.read",
  "treas.reconciliation.manage",
  "treas.payment-batch.read",
  "treas.payment-batch.create",
  "treas.payment-batch.approve",
  "treas.payment-batch.release",
  "treas.payment-batch.cancel",
  "treas.payment-instruction.read",
  "treas.payment-instruction.manage",
  "treas.payment-instruction.approve",
  "treas.cash-position.read",
  "treas.liquidity-forecast.read",
  "treas.liquidity-forecast.manage",
  "treas.liquidity-source-feed.read",
  "treas.liquidity-source-feed.manage",
  "treas.ap-due-projection.read",
  "treas.ap-due-projection.manage",
  "treas.ar-expected-receipt.read",
  "treas.ar-expected-receipt.manage",
  "treas.fx-rate.read",
  "treas.fx-rate.manage",
  "treas.forecast-variance.read",

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

  // Treasury
  "treasury.bank-account.read",
  "treasury.bank-account.write",
  "treasury.bank-statement.read",
  "treasury.bank-statement.ingest",
  "treasury.reconciliation.read",
  "treasury.reconciliation.write",
  "treasury.payment.read",
  "treasury.payment.approve",
  "treasury.payment.release",
  "treasury.cash-position.read",
  "treasury.ap-due-projection.read",
  "treasury.ap-due-projection.manage",
  "treasury.ar-expected-receipt.read",
  "treasury.ar-expected-receipt.manage",
  "treasury.fx-rate.read",
  "treasury.fx-rate.manage",

  // Treasury — Wave 4.1 In-house Banking + Intercompany Transfers
  "erp.finance.treasury.internal-bank-account.read",
  "erp.finance.treasury.internal-bank-account.manage",
  "erp.finance.treasury.intercompany-transfer.read",
  "erp.finance.treasury.intercompany-transfer.manage",
  "erp.finance.treasury.intercompany-transfer.settle",

  // Treasury — Wave 4.2 Netting + Internal Interest
  "erp.finance.treasury.netting-session.read",
  "erp.finance.treasury.netting-session.manage",
  "erp.finance.treasury.netting-session.settle",
  "erp.finance.treasury.internal-interest-rate.read",
  "erp.finance.treasury.internal-interest-rate.manage",

  // Treasury — Wave 5.1 FX Management + Revaluation
  "erp.finance.treasury.fx-exposure.read",
  "erp.finance.treasury.fx-exposure.manage",
  "erp.finance.treasury.hedge-designation.read",
  "erp.finance.treasury.hedge-designation.manage",
  "erp.finance.treasury.revaluation-event.read",
  "erp.finance.treasury.revaluation-event.manage",
  // Treasury — Wave 6.2 Connectors + Market Data
  "erp.finance.treasury.bank-connector.read",
  "erp.finance.treasury.bank-connector.manage",
  "erp.finance.treasury.market-data-feed.read",
  "erp.finance.treasury.market-data-feed.manage",
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
  treasury: PermissionValues.filter((p) => p.startsWith("treasury.")),
} as const;
