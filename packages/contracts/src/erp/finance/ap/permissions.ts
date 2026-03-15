/**
 * @afenda/contracts — AP (Accounts Payable) permissions.
 *
 * RULES:
 *   1. Format: `ap.entity.action` (lowercase dot-separated).
 *   2. Every permission used in AP routes/services MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── AP Permission Keys ────────────────────────────────────────────────────────

export const ApPermissionValues = [
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
] as const;

export const ApPermissionSchema = z.enum(ApPermissionValues);

export type ApPermission = z.infer<typeof ApPermissionSchema>;
