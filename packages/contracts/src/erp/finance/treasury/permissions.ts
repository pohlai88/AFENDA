/**
 * @afenda/contracts — Treasury permissions.
 *
 * CHANGELOG:
 *   - 2026-03-13: Canonicalized treasury scope to `treasury.*` (legacy `treas.*` moved to aliases).
 *
 * RULES:
 *   1. Format: `treasury.entity.action` and `erp.finance.treasury.entity.action`.
 *   2. Every permission used in treasury routes/services MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── Treasury Permission Keys ──────────────────────────────────────────────────

export const TreasuryPermissionValues = [
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
] as const;

export const TreasuryPermissionSchema = z.enum(TreasuryPermissionValues);

export type TreasuryPermission = z.infer<typeof TreasuryPermissionSchema>;
