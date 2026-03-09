/**
 * Auto-instrumentation for domain services.
 *
 * Instead of manually wrapping every function with spans + hardcoded
 * attributes, `instrumentService()` wraps an entire service module in
 * one call.  Span names and attributes are **deterministically derived**
 * from function names and argument shapes — no manual annotation needed.
 *
 * How it works:
 *   1. Each exported function becomes a span named `{namespace}.{fn_name}`.
 *   2. Arguments are duck-typed at call time:
 *        - Has `.activeContext.orgId`?   → `afenda.org.id`
 *        - Has `.principalId`?           → `afenda.principal.id`
 *        - Is a string matching UUID at arg positions? → `afenda.correlation.id`
 *        - Has `.idempotencyKey`?        → `afenda.idempotency.key`
 *   3. Return values matching `{ ok: false, error: { code, message } }`
 *      auto-record a domain error event on the span.
 *   4. Thrown exceptions are recorded + span status set to ERROR.
 *
 * When OTEL_ENABLED=false the OTel API returns noop spans — zero overhead.
 *
 * Usage:
 *   // finance/ap/index.ts
 *   import { instrumentService } from "../../infra/tracing.js";
 *   import * as raw from "./invoice.service.js";
 *   export const { submitInvoice, approveInvoice, ... } = instrumentService("ap", raw);
 *
 *   // That's it. Every call to submitInvoice() now produces a span:
 *   //   name:  "ap.submit_invoice"
 *   //   attrs: afenda.org.id, afenda.principal.id, afenda.correlation.id
 *   //   events: domain.error (if { ok: false })
 */

import { trace, SpanStatusCode, context, type Span } from "@opentelemetry/api";

// ── Tracer instance ──────────────────────────────────────────────────────────
const tracer = trace.getTracer("@afenda/core", "0.3.0");

// ── Attribute keys (internal — consumers never need to import these) ─────────
const A = {
  ORG_ID:          "afenda.org.id",
  PRINCIPAL_ID:    "afenda.principal.id",
  CORRELATION_ID:  "afenda.correlation.id",
  IDEMPOTENCY_KEY: "afenda.idempotency.key",
  ERROR_CODE:      "afenda.error.code",
  ORG_SLUG:        "afenda.org.slug",
} as const;

// ── Name derivation ──────────────────────────────────────────────────────────

/** camelCase → snake_case: "submitInvoice" → "submit_invoice" */
function toSnake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

// ── Argument extraction (duck-typing) ────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Extractable {
  [A.ORG_ID]?: string;
  [A.PRINCIPAL_ID]?: string;
  [A.CORRELATION_ID]?: string;
  [A.IDEMPOTENCY_KEY]?: string;
}

/**
 * Walk the argument list and pull out span attributes by duck-typing.
 *
 * Detection rules (executed once per call — fast, no recursion):
 *   obj.activeContext.orgId  → afenda.org.id    (OrgScopedContext)
 *   obj.principalId          → afenda.principal.id (PolicyContext)
 *   typeof arg === "string" && UUID_RE            → afenda.correlation.id (first match only)
 *   obj.idempotencyKey       → afenda.idempotency.key
 *   obj.correlationId        → afenda.correlation.id (inside params objects)
 */
function extractAttrs(args: unknown[]): Record<string, string> {
  const attrs: Record<string, string> = {};
  let correlationFound = false;

  for (const arg of args) {
    // String UUID arg → correlation ID (first string UUID wins)
    if (!correlationFound && typeof arg === "string" && UUID_RE.test(arg)) {
      attrs[A.CORRELATION_ID] = arg;
      correlationFound = true;
      continue;
    }

    if (arg !== null && typeof arg === "object") {
      const obj = arg as Record<string, unknown>;

      // OrgScopedContext — { activeContext: { orgId } }
      if (
        typeof obj["activeContext"] === "object" &&
        obj["activeContext"] !== null &&
        typeof (obj["activeContext"] as Record<string, unknown>)["orgId"] === "string"
      ) {
        attrs[A.ORG_ID] = (obj["activeContext"] as Record<string, unknown>)["orgId"] as string;
      }

      // PolicyContext — { principalId }
      if (typeof obj["principalId"] === "string") {
        attrs[A.PRINCIPAL_ID] = obj["principalId"] as string;
      }

      // Params with idempotencyKey
      if (typeof obj["idempotencyKey"] === "string") {
        attrs[A.IDEMPOTENCY_KEY] = obj["idempotencyKey"] as string;
      }

      // Params with correlationId (e.g. PostToGLParams)
      if (!correlationFound && typeof obj["correlationId"] === "string") {
        attrs[A.CORRELATION_ID] = obj["correlationId"] as string;
        correlationFound = true;
      }
    }
  }

  return attrs;
}

// ── Result detection ─────────────────────────────────────────────────────────

/**
 * Check if a return value is a domain error: `{ ok: false, error: { code, message } }`.
 * If so, record it on the span.
 */
function recordResultErrors(span: Span, result: unknown): void {
  if (
    result !== null &&
    typeof result === "object" &&
    (result as Record<string, unknown>)["ok"] === false
  ) {
    const error = (result as Record<string, unknown>)["error"] as
      | Record<string, unknown>
      | undefined;
    if (error && typeof error["code"] === "string") {
      span.setAttribute(A.ERROR_CODE, error["code"] as string);
      span.addEvent("domain.error", {
        "error.code": error["code"] as string,
        "error.message": typeof error["message"] === "string" ? (error["message"] as string) : "",
      });
    }
  }
}

// ── instrumentService ────────────────────────────────────────────────────────

/**
 * Wrap every async function in `fns` with an OTel span.
 *
 * Returns the same object shape with the same types — fully transparent
 * to callers and type inference.
 *
 * @param namespace   Dot prefix for span names, e.g. "ap", "gl", "evidence"
 * @param fns         Module-like object mapping names → async functions
 */
export function instrumentService<
  T extends Record<string, unknown>,
>(namespace: string, fns: T): T {
  const wrapped = {} as Record<string, unknown>;

  for (const [name, fn] of Object.entries(fns)) {
    if (typeof fn !== "function") {
      wrapped[name] = fn; // re-export non-functions as-is (types, consts)
      continue;
    }

    const spanName = `${namespace}.${toSnake(name)}`;

    wrapped[name] = function instrumentedFn(this: unknown, ...args: unknown[]) {
      return tracer.startActiveSpan(spanName, (span: Span) => {
        // Extract attributes from arguments
        const attrs = extractAttrs(args);
        if (Object.keys(attrs).length > 0) {
          span.setAttributes(attrs);
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = (fn as (...a: any[]) => unknown).apply(this, args);

          // Handle async (Promise) results
          if (result && typeof (result as Promise<unknown>).then === "function") {
            return (result as Promise<unknown>)
              .then((resolved) => {
                recordResultErrors(span, resolved);
                span.setStatus({ code: SpanStatusCode.OK });
                span.end();
                return resolved;
              })
              .catch((err: unknown) => {
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: err instanceof Error ? err.message : String(err),
                });
                if (err instanceof Error) span.recordException(err);
                span.end();
                throw err;
              });
          }

          // Sync result (unlikely for services, but handled)
          recordResultErrors(span, result);
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return result;
        } catch (err) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: err instanceof Error ? err.message : String(err),
          });
          if (err instanceof Error) span.recordException(err);
          span.end();
          throw err;
        }
      });
    };
  }

  return wrapped as T;
}

// ── Fastify request attribute helpers ────────────────────────────────────────

/**
 * Auto-extract span attributes from a Fastify request object.
 *
 * Duck-types the request properties — no hardcoded list of what to look for.
 * Anything matching known patterns gets stamped on the active span.
 */
export function extractRequestAttrs(req: Record<string, unknown>): Record<string, string> {
  const attrs: Record<string, string> = {};

  if (typeof req["correlationId"] === "string") attrs[A.CORRELATION_ID] = req["correlationId"] as string;
  if (typeof req["orgSlug"] === "string")       attrs[A.ORG_SLUG] = req["orgSlug"] as string;
  if (typeof req["orgId"] === "string")         attrs[A.ORG_ID] = req["orgId"] as string;

  const ctx = req["ctx"] as Record<string, unknown> | undefined;
  if (ctx && typeof ctx["principalId"] === "string") {
    attrs[A.PRINCIPAL_ID] = ctx["principalId"] as string;
  }

  return attrs;
}

/**
 * Set attributes on the currently-active span (if any).
 * Used by the Fastify OTel plugin to stamp request context on the HTTP span.
 */
export function setActiveSpanAttributes(
  attrs: Record<string, string | number | boolean>,
): void {
  const activeSpan = trace.getSpan(context.active());
  if (activeSpan) {
    activeSpan.setAttributes(attrs);
  }
}

/**
 * Rename the currently-active span.
 *
 * Call this from Fastify's `onSend` hook (after route matching) so the span
 * name reflects the route template instead of the bare HTTP method.
 *
 * Example: "GET" → "GET /v1/invoices/:invoiceId"
 */
export function updateActiveSpanName(name: string): void {
  const activeSpan = trace.getSpan(context.active());
  if (activeSpan) {
    activeSpan.updateName(name);
  }
}

