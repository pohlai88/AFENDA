/**
 * Canonical outbox event envelope.
 *
 * RULES:
 *   1. `type`    — dot-namespaced SCREAMING_SNAKE segments: "AP.INVOICE_SUBMITTED",
 *      "GL.JOURNAL.LINE_POSTED". Each segment starts with a letter; no leading
 *      dots, trailing dots, or consecutive dots allowed.
 *   2. `version` — semver-lite "1" or "1.0". Additive optional payload fields
 *      do NOT require a bump. Breaking changes (removed/renamed fields) MUST
 *      bump MAJOR; keep the old event type alive for at least one release.
 *   3. `payload` — MUST be JSON-serializable. No Date, BigInt, Map, or class
 *      instances. Workers must treat unknown payload keys as forward-compatible.
 *   4. `occurredAt` — ISO-8601 UTC string (Z suffix required). Set by the
 *      emitting service at event creation time.
 *   5. Removing or renaming a top-level payload field is a BREAKING CHANGE —
 *      bump major version and keep the old event type alive for one release.
 *   6. Unknown top-level envelope fields are passed through (.passthrough) so
 *      future fields (traceparent, producer, etc.) don't break old workers.
 */
import { z } from "zod";
import { OrgIdSchema, CorrelationIdSchema } from "../../../shared/ids.js";
import { UtcDateTimeSchema } from "../../../shared/datetime.js";

// ─── Patterns ────────────────────────────────────────────────────────────────

/** Each segment: uppercase letter, then uppercase letters/digits/underscores. */
const OUTBOX_TYPE_PATTERN = /^[A-Z][A-Z0-9]*(\.[A-Z][A-Z0-9_]*)+$/;

const OUTBOX_VERSION_PATTERN = /^\d+(\.\d+)?$/;

// ─── JSON-safe value schema ───────────────────────────────────────────────────

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

/**
 * Recursive JSON-safe value. Lazy to support self-reference.
 * Use this (not `z.unknown()`) for payload fields that must survive
 * JSON serialisation round-trips.
 */
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const JsonObjectSchema = z.record(z.string(), JsonValueSchema);
export type JsonObject = z.infer<typeof JsonObjectSchema>;

// ─── Outbox event envelope ────────────────────────────────────────────────────

export const OutboxEventSchema = z
  .object({
    /** Dot-namespaced event name, e.g. "AP.INVOICE_SUBMITTED", "GL.JOURNAL.LINE_POSTED". */
    type: z
      .string()
      .regex(
        OUTBOX_TYPE_PATTERN,
        'type must be dot-namespaced UPPER (e.g. "AP.INVOICE_SUBMITTED")',
      ),

    /** Semver-lite: "1" or "1.0". Bump MAJOR for breaking payload changes only. */
    version: z.string().regex(OUTBOX_VERSION_PATTERN, "version must be '1' or '1.0'"),

    orgId: OrgIdSchema,
    correlationId: CorrelationIdSchema,

    /** UTC timestamp — Z suffix enforced to prevent silent timezone drift. */
    occurredAt: UtcDateTimeSchema,

    /** JSON-serialisable payload — no Date, BigInt, Map, or class instances. */
    payload: JsonObjectSchema,
  })
  // Forward-compat: new envelope fields (traceparent, producer, …) don't break old workers.
  .passthrough();

export type OutboxEvent = z.infer<typeof OutboxEventSchema>;
