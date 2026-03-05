/**
 * Finance domain — money primitives, journal posting, policy rules.
 *
 * S1+ growth: ap/ (invoice state machine, matching, aging),
 *             gl/ (journal posting service, trial balance, period close).
 */
export * from "./money.js";
export * from "./posting.js";
export * from "./sod.js";
