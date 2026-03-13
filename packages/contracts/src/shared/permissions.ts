/**
 * @afenda/contracts — Canonical permission keys.
 *
 * CHANGELOG:
 *   - 2026-03-13: Canonicalized treasury scope to `treasury.*` (legacy `treas.*` moved to aliases).
 *   - 2026-03-13: Normalized boardroom entity tokens to kebab-case (`agenda-item`, `action-item`).
 *
 * RULES:
 *   1. Format: lowercase dot-separated with kebab-case tokens where needed.
 *      Example: `scope.entity.action` and deeper module paths such as
 *      `erp.finance.treasury.intercompany-transfer.manage`.
 *   2. Every permission used in SoD checks or route guards MUST be listed here.
 *   3. The DB seed script uses these values — keep in sync.
 *   4. Adding a permission is safe. Removing/renaming is BREAKING.
 *   5. Runtime validation is available via `PermissionSchema`.
 */

import { z } from "zod";

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

  // Treasury (canonical prefix)
  "treasury.bank-account.read",
  "treasury.bank-account.write",
  "treasury.bank-account.create",
  "treasury.bank-account.update",
  "treasury.bank-account.activate",
  "treasury.bank-account.deactivate",
  "treasury.bank-statement.read",
  "treasury.bank-statement.ingest",
  "treasury.reconciliation.read",
  "treasury.reconciliation.write",
  "treasury.reconciliation.manage",
  "treasury.payment.read",
  "treasury.payment.approve",
  "treasury.payment.release",
  "treasury.payment-batch.read",
  "treasury.payment-batch.create",
  "treasury.payment-batch.approve",
  "treasury.payment-batch.release",
  "treasury.payment-batch.cancel",
  "treasury.payment-instruction.read",
  "treasury.payment-instruction.manage",
  "treasury.payment-instruction.approve",
  "treasury.cash-position.read",
  "treasury.liquidity-forecast.read",
  "treasury.liquidity-forecast.manage",
  "treasury.liquidity-source-feed.read",
  "treasury.liquidity-source-feed.manage",
  "treasury.ap-due-projection.read",
  "treasury.ap-due-projection.manage",
  "treasury.ar-expected-receipt.read",
  "treasury.ar-expected-receipt.manage",
  "treasury.fx-rate.read",
  "treasury.fx-rate.manage",
  "treasury.forecast-variance.read",

  // Treasury — Wave 4.1 In-house Banking + Intercompany Transfers
  "erp.finance.treasury.internal-bank-account.read",
  "erp.finance.treasury.internal-bank-account.manage",
  "erp.finance.treasury.intercompany-transfer.read",
  "erp.finance.treasury.intercompany-transfer.manage",
  "erp.finance.treasury.intercompany-transfer.settle",

  // COMM — shared
  "comm.comment.create",
  "comm.comment.read",
  "comm.comment.delete",
  "comm.label.create",
  "comm.label.delete",
  "comm.saved-view.create",
  "comm.saved-view.delete",
  "comm.subscription.create",
  "comm.subscription.delete",

  // COMM — tasks
  "comm.task.create",
  "comm.task.read",
  "comm.task.update",
  "comm.task.assign",
  "comm.task.complete",
  "comm.task.archive",
  "comm.task.bulk-assign",
  "comm.task.bulk-transition",

  // COMM — approvals
  "comm.approval.create",
  "comm.approval.read",
  "comm.approval.approve",
  "comm.approval.reject",
  "comm.approval.delegate",
  "comm.approval.escalate",
  "comm.approval.withdraw",
  "comm.approval-policy.read",
  "comm.approval-policy.write",
  "comm.approval-delegation.write",

  // COMM — announcements
  "comm.announcement.create",
  "comm.announcement.publish",
  "comm.announcement.schedule",
  "comm.announcement.archive",
  "comm.announcement.acknowledge",
  "comm.announcement.read",

  // COMM — documents
  "comm.document.read",
  "comm.document.write",
  "comm.document.manage",

  // COMM — workflows
  "comm.workflow.read",
  "comm.workflow.create",
  "comm.workflow.update",
  "comm.workflow.delete",
  "comm.workflow.execute",

  // Boardroom
  "comm.meeting.create",
  "comm.meeting.read",
  "comm.meeting.update",
  "comm.agenda-item.create",
  "comm.agenda-item.read",
  "comm.attendee.create",
  "comm.attendee.read",
  "comm.attendee.update",
  "comm.resolution.create",
  "comm.resolution.read",
  "comm.resolution.vote",
  "comm.minute.record",
  "comm.minute.read",
  "comm.action-item.create",
  "comm.action-item.read",
  "comm.action-item.update",
] as const;

export const PermissionSchema = z.enum(PermissionValues);

export type Permission = z.infer<typeof PermissionSchema>;

export const PermissionValuePattern = /^[a-z0-9]+(?:\.[a-z0-9-]+){2,}$/;

export function isPermission(value: unknown): value is Permission {
  return PermissionSchema.safeParse(value).success;
}

export type PermissionMetaEntry = {
  description?: string;
  deprecated?: boolean;
  replacedBy?: Permission | null;
};

export const LegacyPermissionAliases = {
  "treas.bank-account.read": "treasury.bank-account.read",
  "treas.bank-account.create": "treasury.bank-account.create",
  "treas.bank-account.update": "treasury.bank-account.update",
  "treas.bank-account.activate": "treasury.bank-account.activate",
  "treas.bank-account.deactivate": "treasury.bank-account.deactivate",
  "treas.bank-statement.read": "treasury.bank-statement.read",
  "treas.bank-statement.ingest": "treasury.bank-statement.ingest",
  "treas.reconciliation.read": "treasury.reconciliation.read",
  "treas.reconciliation.manage": "treasury.reconciliation.manage",
  "treas.payment-batch.read": "treasury.payment-batch.read",
  "treas.payment-batch.create": "treasury.payment-batch.create",
  "treas.payment-batch.approve": "treasury.payment-batch.approve",
  "treas.payment-batch.release": "treasury.payment-batch.release",
  "treas.payment-batch.cancel": "treasury.payment-batch.cancel",
  "treas.payment-instruction.read": "treasury.payment-instruction.read",
  "treas.payment-instruction.manage": "treasury.payment-instruction.manage",
  "treas.payment-instruction.approve": "treasury.payment-instruction.approve",
  "treas.cash-position.read": "treasury.cash-position.read",
  "treas.liquidity-forecast.read": "treasury.liquidity-forecast.read",
  "treas.liquidity-forecast.manage": "treasury.liquidity-forecast.manage",
  "treas.liquidity-source-feed.read": "treasury.liquidity-source-feed.read",
  "treas.liquidity-source-feed.manage": "treasury.liquidity-source-feed.manage",
  "treas.ap-due-projection.read": "treasury.ap-due-projection.read",
  "treas.ap-due-projection.manage": "treasury.ap-due-projection.manage",
  "treas.ar-expected-receipt.read": "treasury.ar-expected-receipt.read",
  "treas.ar-expected-receipt.manage": "treasury.ar-expected-receipt.manage",
  "treas.fx-rate.read": "treasury.fx-rate.read",
  "treas.fx-rate.manage": "treasury.fx-rate.manage",
  "treas.forecast-variance.read": "treasury.forecast-variance.read",
  "comm.agenda_item.create": "comm.agenda-item.create",
  "comm.agenda_item.read": "comm.agenda-item.read",
  "comm.action_item.create": "comm.action-item.create",
  "comm.action_item.read": "comm.action-item.read",
  "comm.action_item.update": "comm.action-item.update",
} as const;

export type LegacyPermission = keyof typeof LegacyPermissionAliases;

export const PermissionMeta: Record<string, PermissionMetaEntry> = {
  "treasury.bank-account.read": { description: "Read treasury bank accounts" },
  "treasury.bank-account.write": { description: "Create or update treasury bank accounts" },
  "treasury.payment.approve": { description: "Approve treasury payments" },
  "treasury.payment.release": { description: "Release approved treasury payments" },
  "treasury.reconciliation.manage": { description: "Manage treasury reconciliations" },

  "treas.bank-account.read": {
    deprecated: true,
    replacedBy: "treasury.bank-account.read",
    description: "Legacy treasury scope; migrate to treasury.*",
  },
  "treas.bank-account.create": {
    deprecated: true,
    replacedBy: "treasury.bank-account.create",
    description: "Legacy treasury scope; migrate to treasury.*",
  },
  "comm.agenda_item.create": {
    deprecated: true,
    replacedBy: "comm.agenda-item.create",
    description: "Legacy token style; migrate to kebab-case",
  },
  "comm.action_item.create": {
    deprecated: true,
    replacedBy: "comm.action-item.create",
    description: "Legacy token style; migrate to kebab-case",
  },
};

export function normalizePermission(permission: string): Permission | string {
  const replacement = LegacyPermissionAliases[permission as LegacyPermission];
  return replacement ?? permission;
}

export function validatePermissionVocabulary(
  values: readonly string[] = PermissionValues,
): string[] {
  const issues: string[] = [];
  const unique = new Set(values);

  if (unique.size !== values.length) {
    issues.push("PermissionValues contains duplicate entries");
  }

  for (const value of values) {
    if (value !== value.toLowerCase()) {
      issues.push(`Permission not lowercase: ${value}`);
    }
    if (!PermissionValuePattern.test(value)) {
      issues.push(`Permission format invalid: ${value}`);
    }
  }

  const hasTreasscope = values.some((value) => value.startsWith("treas."));
  const hasTreasuryScope = values.some((value) => value.startsWith("treasury."));
  if (hasTreasscope && hasTreasuryScope) {
    issues.push("Conflicting treasury scopes detected: both treas.* and treasury.*");
  }

  return issues;
}

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
  comm: PermissionValues.filter((p) => p.startsWith("comm.")),
  erp: PermissionValues.filter((p) => p.startsWith("erp.")),
} as const;
