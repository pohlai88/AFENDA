/**
 * Barrel — kernel/registry (entity/field/view/action/flow/overlay metadata)
 *
 * Absorbed from the old meta/ directory per ADR-0005.
 */

// ── Vocabulary ────────────────────────────────────────────────────────────────
export * from "./errors.js";
export * from "./permissions.js";
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
