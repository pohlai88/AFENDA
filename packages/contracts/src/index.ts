/**
 * @afenda/contracts root barrel — re-exports only.
 *
 * RULES:
 *   1. Consumers MUST import from "@afenda/contracts" (this barrel).
 *      Deep file paths are forbidden.
 *   2. Never put Zod schemas or types directly in this file.
 *   3. Add new exports to the appropriate pillar/module barrel.
 *
 * ADR-0005: Pillar structure — shared / kernel / erp / comm
 */

// ── shared (universal primitives) ────────────────────────────────────────────
export * from "./shared/index.js";

// ── cross-pillar aggregators (root-only composition) ───────────────────────
export * from "./all-errors.js";
export * from "./all-permissions.js";

// ── kernel (system truth capabilities) ───────────────────────────────────────
export * from "./kernel/index.js";

// ── erp (business domains) ───────────────────────────────────────────────────
export * from "./erp/index.js";

// ── comm (communication surfaces) ────────────────────────────────────────────
export * from "./comm/index.js";

// ── ui (shell architecture types) ────────────────────────────────────────────
// export * from "./ui/index.js"; // TODO: Re-enable after new shell is built
