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

  // GL (General Ledger)
  "gl.account.read",
  "gl.journal.post",
  "gl.journal.reverse",
  "gl.journal.read",

  // Supplier
  "sup.supplier.read",
  "sup.supplier.create",

  // Document / Evidence
  "doc.document.read",
  "doc.evidence.attach",

  // Audit
  "audit.log.read",

  // Admin
  "admin.org.manage",
] as const;

export type Permission = (typeof PermissionValues)[number];

// ── Grouped by scope (convenience for UI rendering) ───────────────────────────

export const PERMISSION_SCOPES = {
  iam: PermissionValues.filter((p) => p.startsWith("iam.")),
  ap: PermissionValues.filter((p) => p.startsWith("ap.")),
  gl: PermissionValues.filter((p) => p.startsWith("gl.")),
  sup: PermissionValues.filter((p) => p.startsWith("sup.")),
  doc: PermissionValues.filter((p) => p.startsWith("doc.")),
  audit: PermissionValues.filter((p) => p.startsWith("audit.")),
  admin: PermissionValues.filter((p) => p.startsWith("admin.")),
} as const;
