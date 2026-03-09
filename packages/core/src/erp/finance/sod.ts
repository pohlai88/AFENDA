/**
 * Separation of Duties (SoD) — re-exports from kernel governance.
 *
 * ADR-0005 §3.2: SoD is a governance concern owned by kernel.
 * This file re-exports the canonical rules so ERP consumers can import
 * from their local module barrel without reaching into kernel directly.
 */

// Re-export canonical SoD rules from kernel
export { canApproveInvoice, canPostToGL, canMarkPaid } from "../../kernel/governance/policy/sod-rules.js";

// Re-export policy types from contracts (canonical source)
export type { PolicyContext, PolicyDenialCode, PolicyResult } from "@afenda/contracts";

