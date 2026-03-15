/**
 * @afenda/contracts — Canonical permission keys.
 *
 * CHANGELOG:
 *   - 2026-03-14: Split permissions into domain-specific files for DRY (Architecture Phase 2).
 *   - 2026-03-13: Canonicalized treasury scope to `treasury.*` (legacy `treas.*` moved to aliases).
 *   - 2026-03-13: Normalized boardroom entity tokens to kebab-case (`agenda-item`, `action-item`).
 *
 * Domain-specific permission files:
 *   - erp/finance/ap/permissions.ts (AP invoices, payment runs, etc.)
 *   - erp/finance/gl/permissions.ts (General Ledger)
 *   - erp/supplier/permissions.ts (Supplier management + Purchasing)
 *   - erp/finance/treasury/permissions.ts (Treasury operations)
 *   - kernel/identity/permissions.ts (IAM)
 *   - kernel/governance/evidence/permissions.ts (Documents/Evidence)
 *   - kernel/governance/audit/permissions.ts (Audit)
 *   - kernel/registry/permissions.ts (Admin, Settings, Custom Fields)
 *   - comm/permissions.ts (Communication, Tasks, Approvals, Boardroom)
 *
 * RULES:
 *   1. Format: lowercase dot-separated with kebab-case tokens where needed.
 *   2. Every permission used in SoD checks or route guards MUST be listed in domain files.
 *   3. The DB seed script uses these values — keep in sync.
 *   4. Adding a permission is safe. Removing/renaming is BREAKING.
 *   5. Runtime validation is available via `PermissionSchema`.
 */

// ── Permission Pattern Validation ─────────────────────────────────────────────

/**
 * Permission format pattern: lowercase dot-separated with optional kebab-case.
 * Examples: iam.role.read, ap.invoice.approve, treasury.bank-account.create
 * Minimum 3 tokens: scope.entity.action
 */
export const PermissionValuePattern = /^[a-z0-9]+(?:\.[a-z0-9-]+){2,}$/;

// ── Legacy Permission Aliases ──────────────────────────────────────────────────
const LegacyPermissionAliases = {
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

export type PermissionMetaEntry = {
  description?: string;
  deprecated?: boolean;
  replacedBy?: string;
};

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

/**
 * Normalize legacy permission aliases to current canonical forms.
 * Returns the canonical permission if an alias is found, otherwise returns the input unchanged.
 */
export function normalizePermission(permission: string): string {
  const replacement = LegacyPermissionAliases[permission as LegacyPermission];
  return replacement ?? permission;
}

/**
 * Validate permission vocabulary for format and uniqueness.
 * @param values Array of permission strings to validate
 * @returns Array of validation issue messages (empty if valid)
 */
export function validatePermissionVocabulary(values: readonly string[]): string[] {
  const issues: string[] = [];
  const unique = new Set(values);

  if (unique.size !== values.length) {
    issues.push("Permission array contains duplicate entries");
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
