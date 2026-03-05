/**
 * Schema barrel — re-exports only.
 *
 * Each domain has its own file. Never add table definitions here.
 * drizzle-kit reads this file via drizzle.config.ts → schema path.
 */

// ── IAM (organization, principals, roles, permissions, memberships) ──────────
export * from "./iam.js";

// ── Supplier ─────────────────────────────────────────────────────────────────
export * from "./supplier.js";

// ── Document + Evidence ──────────────────────────────────────────────────────
export * from "./document.js";

// ── Finance (CoA, invoice, journal) ──────────────────────────────────────────
export * from "./finance.js";

// ── Infra (outbox, idempotency, audit, sequence, dead letter) ────────────────
export * from "./infra.js";

// ── Relations (powers db.query.* relational API) ───────────────────────────
export * from "./relations.js";
