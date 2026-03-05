/**
 * @afenda/contracts root barrel — re-exports only.
 *
 * RULES:
 *   1. Consumers MUST import from "@afenda/contracts" (this barrel) or a
 *      domain sub-barrel (e.g. "@afenda/contracts/invoice"). Deep file
 *      paths are forbidden — rename files freely without breaking callers.
 *   2. Never put Zod schemas or types directly in this file.
 *   3. Add new exports to the appropriate domain barrel, then re-export
 *      that barrel here.
 */

// ── shared (primitives that appear in 3+ domains) ────────────────────────────
export * from "./shared/index.js";

// ── iam ───────────────────────────────────────────────────────────────────────
export * from "./iam/index.js";

// ── supplier ──────────────────────────────────────────────────────────────────
export * from "./supplier/index.js";

// ── invoice ───────────────────────────────────────────────────────────────────
export * from "./invoice/index.js";

// ── gl ────────────────────────────────────────────────────────────────────────
export * from "./gl/index.js";

// ── evidence ──────────────────────────────────────────────────────────────────
export * from "./evidence/index.js";
