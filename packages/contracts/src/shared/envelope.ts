/**
 * API response envelopes — success, error, and cursor-paginated list.
 *
 * RULES:
 *   1. Every response carries a `correlationId` (UUID) for end-to-end tracing.
 *      Source of truth for the schema is `ids.ts#CorrelationIdSchema`.
 *   2. Error codes must follow the canonical SCREAMING_SNAKE_CASE shape.
 *      Registry membership is validated at higher layers using the package-root
 *      combined `ErrorCodeSchema`, keeping shared/ free of pillar imports.
 *   3. `makeSuccessEnvelopeSchema` and `makeCursorEnvelopeSchema` are schema
 *      factories, not constants. Name them with the `make` prefix so callers
 *      know to invoke them with an inner schema, not use them directly.
 *   4. `makeCursorEnvelopeSchema` enforces: `cursor` MUST be `null` when
 *      `hasMore` is `false`. Validated via `.superRefine()`.
 *   5. Envelopes must NOT directly reference domain schemas. They accept Zod
 *      type parameters — keep this file transport-agnostic and domain-free.
 */
import { z } from "zod";
import { CorrelationIdSchema, type CorrelationId } from "./ids.js";
import { ApiErrorSchema } from "./errors.js";

// ─── Error envelope (Stripe-inspired) ───────────────────────────────────────

export const ErrorEnvelopeSchema = z.object({
  error: ApiErrorSchema,
  correlationId: CorrelationIdSchema,
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/** Runtime helper to build and validate an error envelope. */
export function makeErrorEnvelope(
  error: z.infer<typeof ApiErrorSchema>,
  correlationId: string,
): ErrorEnvelope {
  return ErrorEnvelopeSchema.parse({ error, correlationId });
}

// ─── Success wrapper for single-item responses ──────────────────────────────

/**
 * Schema factory — call with the inner data schema to get a typed envelope.
 *
 * @example
 *   const schema = makeSuccessEnvelopeSchema(InvoiceSchema);
 *   type Response = z.infer<typeof schema>; // { data: Invoice; correlationId: string }
 */
export const makeSuccessEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    correlationId: CorrelationIdSchema,
  });

export type SuccessEnvelope<T> = {
  data: T;
  correlationId: CorrelationId;
};

/** Runtime helper to build and validate a success envelope. */
export function makeSuccessEnvelope<T extends z.ZodTypeAny>(
  schema: T,
  data: z.infer<T>,
  correlationId: string,
) {
  const envelopeSchema = makeSuccessEnvelopeSchema(schema);
  return envelopeSchema.parse({ data, correlationId });
}

// ─── Cursor pagination envelope ─────────────────────────────────────────────

/**
 * Schema factory for cursor-paginated list responses.
 *
 * Invariant: `cursor` MUST be `null` when `hasMore` is `false`.
 *
 * @example
 *   const schema = makeCursorEnvelopeSchema(InvoiceSchema);
 */
export const makeCursorEnvelopeSchema = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      data: z.array(item),
      cursor: z.string().nullable(),
      hasMore: z.boolean(),
      correlationId: CorrelationIdSchema,
    })
    .superRefine((v, ctx) => {
      if (!v.hasMore && v.cursor !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cursor"],
          message: "cursor must be null when hasMore is false",
        });
      }

      if (v.hasMore && (v.cursor === null || v.cursor.trim().length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cursor"],
          message: "cursor must be a non-empty string when hasMore is true",
        });
      }
    });

export type CursorEnvelope<T> = {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: CorrelationId;
};

/** Runtime helper to build and validate a cursor envelope. */
export function makeCursorEnvelope<T extends z.ZodTypeAny>(
  itemSchema: T,
  data: z.infer<T>[],
  cursor: string | null,
  hasMore: boolean,
  correlationId: string,
) {
  const envelopeSchema = makeCursorEnvelopeSchema(itemSchema);
  return envelopeSchema.parse({ data, cursor, hasMore, correlationId });
}
