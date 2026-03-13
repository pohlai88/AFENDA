/**
 * @afenda/core — domain business logic.
 *
 * Pillar layout:
 *   kernel/  — identity, governance (audit, evidence, policy), execution, infrastructure
 *   erp/     — finance (money, SoD, AP, GL)
 *   comm/    — (empty — Sprint 3+)
 */

// ── DB client (re-exported from @afenda/db) ──────────────────────────────────
export { createDb, checkDbHealth, withOrgContext, warmUpDbWithRetry } from "@afenda/db";
export type {
  DbClient,
  OrgContext,
  CreateDbOptions,
  DbHealthResult,
  WarmUpOptions,
} from "@afenda/db";

// ── Pillar re-exports ────────────────────────────────────────────────────────
export * from "./kernel/index";
export * from "./erp/index";
export * from "./comm/index";

// ── Projection layer (portal interactions) ──────────────────────────────────
export * from "./projections/index";
