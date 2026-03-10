/**
 * Generic projection primitives — reusable across ALL portal projections.
 *
 * Three projection classes:
 *   - Class A (Query): Read-only domain data shaped for portal consumption
 *   - Class B (Composer): Multi-domain aggregation combining multiple queries
 *   - Class C (Interaction): Portal action → domain command routing
 *
 * All projection functions accept the same dependency tuple:
 *   (db: DbClient, ctx: OrgScopedContext, correlationId: CorrelationId, ...)
 *
 * Results are wrapped in ProjectionEnvelope<T> for traceability.
 */

import type { DbClient } from "@afenda/db";
import type { CorrelationId } from "@afenda/contracts";
import type { OrgScopedContext } from "../../kernel/governance/audit/audit.js";
import type { PolicyContext } from "@afenda/contracts";
import type { ProjectionEnvelope } from "./projection-envelope.js";

// ── Service Result Pattern ───────────────────────────────────────────────────

/**
 * Standard error shape for projection operations.
 * Mirrors InvoiceServiceError / HoldServiceError from domain services.
 */
export interface ProjectionError {
  code: string;
  message: string;
  meta?: Record<string, string>;
}

/**
 * Discriminated union result — all projection functions return this.
 */
export type ProjectionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProjectionError };

// ── Class A: Query Projection ────────────────────────────────────────────────

/**
 * A read-only projection query that fetches domain data and shapes it for
 * portal consumption. Returns data wrapped in a ProjectionEnvelope.
 *
 * @example
 * ```typescript
 * const getInvoices: ProjectionQuery<
 *   { supplierId: SupplierId; status?: InvoiceStatus },
 *   SupplierInvoiceView[]
 * > = async (db, ctx, correlationId, params) => { ... };
 * ```
 */
export type ProjectionQuery<TParams, TData> = (
  db: DbClient,
  ctx: OrgScopedContext,
  correlationId: CorrelationId,
  params: TParams,
) => Promise<ProjectionResult<ProjectionEnvelope<TData>>>;

// ── Class B: Composer Projection ─────────────────────────────────────────────

/**
 * A multi-domain composite projection that aggregates data from multiple
 * queries into a single portal-ready view model.
 *
 * Same signature as ProjectionQuery — composers are transparently composable.
 */
export type ProjectionComposer<TParams, TData> = (
  db: DbClient,
  ctx: OrgScopedContext,
  correlationId: CorrelationId,
  params: TParams,
) => Promise<ProjectionResult<ProjectionEnvelope<TData>>>;

// ── Class C: Interaction ─────────────────────────────────────────────────────

/**
 * A portal interaction that routes a user action to one or more domain
 * commands. Requires a PolicyContext for authorization.
 *
 * @example
 * ```typescript
 * const submitInvoiceFromPortal: ProjectionInteraction<
 *   SubmitInvoiceInput,
 *   { invoiceId: InvoiceId; invoiceNumber: string }
 * > = async (db, ctx, policyCtx, correlationId, input) => { ... };
 * ```
 */
export type ProjectionInteraction<TInput, TOutput> = (
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  input: TInput,
) => Promise<ProjectionResult<TOutput>>;

// ── Class C variant: Query with Policy ───────────────────────────────────────

/**
 * A query that also requires authorization context (e.g., queries that
 * filter data based on the caller's permissions).
 */
export type AuthorizedProjectionQuery<TParams, TData> = (
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  correlationId: CorrelationId,
  params: TParams,
) => Promise<ProjectionResult<ProjectionEnvelope<TData>>>;
