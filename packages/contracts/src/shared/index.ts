/**
 * Barrel — shared/ (universal primitives with zero business ownership)
 *
 * ADR-0005 §3.3: shared/ is brutally narrow. Only context-free primitives here.
 *
 * TODO: Split errors.ts → shared/result.ts + module-local error codes
 * TODO: Split permissions.ts → kernel + module-local permissions
 */
// Primitive schemas — these stay in shared/
export * from "./ids.js";
export * from "./datetime.js";
export * from "./money.js";
export * from "./pagination.js";
export * from "./headers.js";

// errors.ts and permissions.ts stay in shared/ for now (splitting deferred)
export * from "./errors.js";
export * from "./permissions.js";

// Composite schemas — depend on ids + errors
export * from "./envelope.js";
