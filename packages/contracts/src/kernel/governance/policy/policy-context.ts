/**
 * Policy context — minimal principal context for policy evaluation.
 *
 * Deliberately narrow to keep the policy layer decoupled from full
 * RequestContext. All policy resolvers accept this shape.
 */
import type { PrincipalId } from "../../../shared/ids.js";

/**
 * Minimal context required for policy evaluation.
 * - `principalId`: optional during migration or system-initiated actions
 * - `permissionsSet`: ReadonlySet for O(1) permission checks
 */
export type PolicyContext = Readonly<{
  principalId?: PrincipalId;
  permissionsSet: ReadonlySet<string>;
}>;

/**
 * Stable, contract-safe denial codes.
 */
export type PolicyDenialCode = "MISSING_PERMISSION" | "SOD_SAME_PRINCIPAL" | "MISSING_CONTEXT";

/**
 * Policy result with structured metadata.
 */
export type PolicyResult =
  | { allowed: true }
  | {
      allowed: false;
      code: PolicyDenialCode;
      reason: string;
      meta?: Record<string, string>;
    };
