/**
 * Barrel — re-exports every primitive in `contracts/shared`.
 *
 * RULES:
 *   1. Exports only — no imports that execute code, no side effects, no logic.
 *   2. Order: primitive schemas first, composites that depend on them last.
 *   3. Reordering lines is a git-diff noise source — keep the order stable.
 */
// Primitive schemas first — dependants below may import from these.
export * from "./ids.js";
export * from "./datetime.js";
export * from "./errors.js";
export * from "./headers.js";
export * from "./idempotency.js";
export * from "./money.js";
export * from "./pagination.js";
export * from "./audit.js";
export * from "./audit-query.js";
export * from "./permissions.js";
export * from "./sequence.js";
// Composite schemas — depend on ids + errors.
export * from "./envelope.js";
export * from "./outbox.js";
