/**
 * Schema barrel — re-exports only.
 *
 * Each module has its own file under pillar directories. Never add table
 * definitions here. drizzle-kit reads this file via drizzle.config.ts → schema path.
 */

// ── Shared helpers ───────────────────────────────────────────────────────────
export * from "./_helpers";

// ── Auth core (MFA, challenges, sessions, revocations, incidents) ─────────────
export * from "./auth-core";

// ── Auth compliance (control runs, evidence, review cycles, SOX/ISO) ──────────
export * from "./auth-compliance";

// ── Kernel (identity, governance, execution) ─────────────────────────────────
export * from "./kernel/index";

// ── ERP (finance, supplier) ──────────────────────────────────────────────────
export * from "./erp/index";

// ── Relations (powers db.query.* relational API) ─────────────────────────────
export * from "./relations/index";

