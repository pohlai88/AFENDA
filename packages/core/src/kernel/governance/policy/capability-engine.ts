/**
 * Capability Engine — evaluates field + action permissions for any entity.
 *
 * This is the single entry point for capability resolution. It dispatches
 * to entity-specific resolvers registered in the resolver registry.
 *
 * RULES:
 *   1. No HTTP/Fastify/React imports — pure domain.
 *   2. Fail-closed: unknown entity → all fields hidden, all actions denied.
 *   3. `policyVersion` tracks rule changes for cache invalidation.
 *   4. Each entity resolver is responsible for its own SoD logic.
 *   5. The engine does NOT import from `@afenda/ui` — it uses contracts types only.
 */
import type { CapabilityResult, FieldCap, ActionCap, PolicyContext } from "@afenda/contracts";
import { createLogger } from "../../infrastructure/logger";
import { instrumentService } from "../../infrastructure/tracing";

const log = createLogger("policy");

// ── Policy version — bump when rules change ──────────────────────────────────
export const POLICY_VERSION = "1.0.0";

// ── Default cache TTL (seconds) ──────────────────────────────────────────────
const DEFAULT_CACHE_TTL = 60;

// ── Entity record context (optional — for record-level SoD) ──────────────────

/**
 * Minimal record context for record-level policy evaluation.
 * Entity resolvers may need specific fields from the record (e.g. submittedByPrincipalId
 * for SoD checks). We keep this as a generic record to avoid coupling the engine
 * to specific entity schemas.
 */
export type RecordContext = Readonly<Record<string, unknown>>;

// ── Entity resolver interface ────────────────────────────────────────────────

/**
 * An entity capability resolver evaluates field + action permissions
 * for a specific entity type.
 *
 * Implementations receive the principal's policy context and an optional
 * record for record-level SoD checks (e.g. "submitter cannot approve").
 */
export interface EntityCapabilityResolver {
  /** Entity key this resolver handles (e.g. "finance.ap_invoice") */
  readonly entityKey: string;

  /**
   * Resolve field-level capabilities.
   * Must return an entry for every field in the entity.
   * Missing fields default to "hidden" in the UI (fail-closed).
   */
  resolveFieldCaps(
    ctx: PolicyContext,
    record?: RecordContext,
  ): Record<string, FieldCap>;

  /**
   * Resolve action-level capabilities.
   * Must return an entry for every action defined on the entity.
   */
  resolveActionCaps(
    ctx: PolicyContext,
    record?: RecordContext,
  ): Record<string, ActionCap>;
}

// ── Resolver registry ────────────────────────────────────────────────────────

const resolvers = new Map<string, EntityCapabilityResolver>();

/** Register an entity capability resolver. */
export function registerCapabilityResolver(resolver: EntityCapabilityResolver): void {
  resolvers.set(resolver.entityKey, resolver);
}

/** Get a resolver for an entity key, or undefined if none registered. */
export function getCapabilityResolver(entityKey: string): EntityCapabilityResolver | undefined {
  return resolvers.get(entityKey);
}

// ── Main API ─────────────────────────────────────────────────────────────────

/**
 * Resolve capabilities for an entity + principal + optional record.
 *
 * Fail-closed: if no resolver is registered for the entity, returns
 * empty fieldCaps/actionCaps (UI defaults hidden fields to "hidden").
 */
export function resolveCapabilities(
  ctx: PolicyContext,
  entityKey: string,
  record?: RecordContext,
): CapabilityResult {
  const resolver = resolvers.get(entityKey);
  const evaluatedAt = new Date().toISOString();

  if (!resolver) {
    log.debug(
      { entityKey, principalId: ctx.principalId },
      "No capability resolver registered — fail-closed",
    );
    return {
      fieldCaps: {},
      actionCaps: {},
      policyVersion: POLICY_VERSION,
      evaluatedAt,
      cacheTtlSeconds: DEFAULT_CACHE_TTL,
    };
  }

  const fieldCaps = resolver.resolveFieldCaps(ctx, record);
  const actionCaps = resolver.resolveActionCaps(ctx, record);

  // Log denied actions at debug level for production tracing
  const deniedActions = Object.entries(actionCaps)
    .filter(([, cap]) => !cap.allowed)
    .map(([key, cap]) => ({ action: key, reason: cap.reason?.code }));

  log.debug(
    {
      entityKey,
      principalId: ctx.principalId,
      policyVersion: POLICY_VERSION,
      evaluatedAt,
      fieldCount: Object.keys(fieldCaps).length,
      actionCount: Object.keys(actionCaps).length,
      deniedCount: deniedActions.length,
      deniedActions: deniedActions.length > 0 ? deniedActions : undefined,
    },
    "Capability evaluation completed",
  );

  return {
    fieldCaps,
    actionCaps,
    policyVersion: POLICY_VERSION,
    evaluatedAt,
    cacheTtlSeconds: DEFAULT_CACHE_TTL,
  };
}

// ── Instrumented exports ─────────────────────────────────────────────────────
// Wrap the capability engine functions with OTel spans so every
// resolveCapabilities call is traceable in production.

const instrumented = instrumentService("policy", {
  resolveCapabilities,
});

/** Instrumented `resolveCapabilities` — produces OTel span `policy.resolve_capabilities` */
export const resolveCapabilitiesTraced = instrumented.resolveCapabilities;
