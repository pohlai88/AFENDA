/**
 * Policy domain — capability evaluation engine.
 *
 * Generalises per-entity SoD checks (canApproveInvoice, canPostToGL, canMarkPaid)
 * into a single dispatch that returns the normalised CapabilityResult contract.
 *
 * Entity resolvers are registered here. Each resolver understands its own
 * permission checks, SoD rules, and field-visibility logic.
 *
 * RULES:
 *   1. No HTTP/Fastify/React imports — pure domain service.
 *   2. Permission checks use `hasPermission()` — O(1), never role-name checks.
 *   3. Fail-closed: unknown entity → all fields hidden, all actions denied.
 *   4. `policyVersion` is bumped when rules change — clients can invalidate.
 */
export * from "./capability-engine.js";
export * from "./resolvers/index.js";
