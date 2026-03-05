/**
 * Barrel — re-exports every IAM schema from `contracts/iam`.
 *
 * RULES:
 *   1. Exports only — no imports that execute code, no side effects, no logic.
 *   2. Import order: foundational vocabulary first (roles, role-types), then
 *      entities that depend on them.
 *   3. Consumers must import from `@afenda/contracts`, never from deep paths.
 *
 * ADR-0003: Added party model (party, principal, membership, role-type).
 */
export * from "./role.entity.js";
export * from "./role-type.js";
export * from "./party.entity.js";
export * from "./principal.entity.js";
export * from "./membership.entity.js";
export * from "./tenant.entity.js";
export * from "./user.entity.js";
