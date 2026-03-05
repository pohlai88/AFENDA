/**
 * IAM role and permission vocabulary.
 *
 * RULES:
 *   1. `Permissions` is the single source of truth — `PermissionKeyValues` and
 *      `PermissionKeySchema` are derived from it. Add a permission once here;
 *      everything else updates automatically.
 *   2. Permission keys use dot-notation: `scope.noun` or `scope.noun.verb`
 *      (lowercase only). Enforced by `PERM_PATTERN` at parse time.
 *   3. Role keys are lowercase identifiers. Labels, descriptions, and default
 *      permission sets belong in `@afenda/core` — not here.
 *   4. Removing or renaming a key is a BREAKING CHANGE — add a `@deprecated`
 *      comment for at least one major version before removal.
 *   5. Never reuse a removed key for a different meaning.
 */
import { z } from "zod";

// ─── Permissions (single source of truth) ────────────────────────────────────

/**
 * Canonical permission registry.
 * - Keys: developer-friendly camelCase identifiers (stable, for use in code).
 * - Values: wire-level dot-notation strings (stable API + DB surface).
 *
 * Add a permission here; `PermissionKeyValues` and `PermissionKeySchema` update
 * automatically.
 */
export const Permissions = {
  apInvoiceSubmit:   "ap.invoice.submit",
  apInvoiceApprove:  "ap.invoice.approve",
  glJournalPost:     "gl.journal.post",
  apInvoiceMarkPaid: "ap.invoice.markpaid",
  evidenceAttach:    "evidence.attach",
  auditLogRead:      "audit.log.read",
  adminTenantManage: "admin.tenant.manage",
  supplierOnboard:   "supplier.onboard",
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

/** Enforces lowercase dot-notation: `scope.noun` or `scope.noun.verb`. */
const PERM_PATTERN = /^[a-z]+(\.[a-z]+)+$/;

// Cast to the non-empty tuple that z.enum() requires, then re-export as readonly.
const _permKeyTuple = Object.values(Permissions) as [PermissionKey, ...PermissionKey[]];

/** Derived from `Permissions` — do not maintain separately. */
export const PermissionKeyValues: readonly PermissionKey[] = _permKeyTuple;

export const PermissionKeySchema = z
  .enum(_permKeyTuple)
  .refine((v) => PERM_PATTERN.test(v), {
    message: "Permission key must be lowercase dot-notation (e.g. ap.invoice.submit)",
  });

// ─── Roles ───────────────────────────────────────────────────────────────────

export const RoleKeyValues = [
  "admin",
  "operator",
  "approver",
  "supplier",
  "viewer",
] as const;

export const RoleKeySchema = z.enum(RoleKeyValues);
export type RoleKey = z.infer<typeof RoleKeySchema>;

