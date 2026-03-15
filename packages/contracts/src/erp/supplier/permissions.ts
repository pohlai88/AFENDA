/**
 * @afenda/contracts — Supplier & Purchasing permissions.
 *
 * RULES:
 *   1. Format: `sup.entity.action` and `purch.entity.action` (lowercase dot-separated).
 *   2. Every permission used in supplier/purchasing routes MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── Supplier & Purchasing Permission Keys ─────────────────────────────────────

export const SupplierPermissionValues = [
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

  // Purchasing (PO, receipt)
  "purch.purchase-order.read",
  "purch.purchase-order.create",
  "purch.receipt.read",
  "purch.receipt.create",
] as const;

export const SupplierPermissionSchema = z.enum(SupplierPermissionValues);

export type SupplierPermission = z.infer<typeof SupplierPermissionSchema>;
