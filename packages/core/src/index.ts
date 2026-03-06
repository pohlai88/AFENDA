/**
 * @afenda/core — domain business logic.
 *
 * This is the ONLY package that may join `@afenda/contracts` (Zod schemas /
 * branded types) with `@afenda/db` (Drizzle table definitions + client).
 * All business rules, policy checks, and domain calculations live here.
 *
 * Domain layout:
 *   iam/        — Identity resolution, tenant context, request authentication
 *   finance/    — Money primitives, journal posting invariants, SoD policy
 *   document/   — Evidence registration + entity linking
 *   infra/      — Cross-cutting: audit log, idempotency, sequences, env config,
 *                  telemetry, tracing, OTel insight factory
 *
 * Sprint 1 additions:
 *   finance/ap/ — Invoice state machine, matching, aging
 *   finance/gl/ — GL journal posting service, trial balance
 *   supplier/   — Supplier onboarding + status service
 *
 * Sprint 2 additions:
 *   infra/telemetry.ts    — OTel SDK bootstrap (OTEL_ENABLED guard)
 *   infra/tracing.ts      — Auto-instrumentation for domain services
 *   infra/otel-insights.ts — Trace analysis → actionable recommendations
 */

// ── DB client (re-exported from @afenda/db) ──────────────────────────────────
export { createDb, checkDbHealth, withOrgContext } from "@afenda/db";
export type { DbClient, OrgContext, CreateDbOptions, DbHealthResult } from "@afenda/db";

// ── Domain services ──────────────────────────────────────────────────────────
export * from "./iam/index.js";
export * from "./finance/index.js";
export * from "./document/index.js";
export * from "./infra/index.js";

// ── Policy / capability engine ───────────────────────────────────────────────
export * from "./policy/index.js";
