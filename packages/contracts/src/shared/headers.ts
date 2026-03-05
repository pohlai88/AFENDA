/**
 * Wire-level HTTP header constants. No Zod, no logic.
 *
 * RULES:
 *   1. Constants only — no schemas, no parsing, no defaults here.
 *   2. API layer must read headers using exactly these names (lowercase).
 *      Never accept ad-hoc variants like "org-id" or "X-Org".
 *   3. Adding a header is non-breaking; renaming is BREAKING across all
 *      consumers (API, worker, web, gateway). Deprecate before removal.
 */

export const CorrelationIdHeader = "x-correlation-id" as const;
export const IdempotencyKeyHeader = "idempotency-key" as const;
export const OrgIdHeader = "x-org-id" as const;

/** Typed allowlist — use to enumerate or validate header names. */
export const HeaderNameValues = [CorrelationIdHeader, IdempotencyKeyHeader, OrgIdHeader] as const;

export type HeaderName = (typeof HeaderNameValues)[number];
