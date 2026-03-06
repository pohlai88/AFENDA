/**
 * Barrel — re-exports every meta schema from `contracts/meta`.
 *
 * RULES:
 *   1. Exports only — no imports that execute code, no side effects, no logic.
 *   2. Vocabulary/primitives first, composites last.
 *   3. Consumers must import from `@afenda/contracts`, never from deep paths.
 */

// ── Vocabulary ────────────────────────────────────────────────────────────────
export * from "./field-type.js";

// ── Entity / Field definitions ────────────────────────────────────────────────
export * from "./entity-def.js";
export * from "./field-def.js";

// ── View DSL ──────────────────────────────────────────────────────────────────
export * from "./view-def.js";

// ── Actions ───────────────────────────────────────────────────────────────────
export * from "./action-def.js";

// ── Overlays ──────────────────────────────────────────────────────────────────
export * from "./overlay-def.js";

// ── Flow (state machine) ──────────────────────────────────────────────────────
export * from "./flow-def.js";

// ── Capabilities ──────────────────────────────────────────────────────────────
export * from "./capability.js";
