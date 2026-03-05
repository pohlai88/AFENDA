/**
 * Finance domain — money primitives, journal posting, policy rules.
 *
 * Sprint 1: ap/ (invoice lifecycle), gl/ (journal posting service, trial balance).
 * S2+ growth: ap/matching, ap/aging, gl/period close.
 */
export * from "./money.js";
export * from "./posting.js";
export * from "./sod.js";

// ── Sprint 1 ─────────────────────────────────────────────────────────────────
export * from "./ap/index.js";
export * from "./gl/index.js";
