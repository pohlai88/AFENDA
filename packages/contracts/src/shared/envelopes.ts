import { z } from "zod";

import { UtcDateTimeSchema } from "./datetime.js";

/**
 * Core metadata shared by envelopes.
 * Strict shape avoids silent metadata drift.
 */
export const EnvelopeMetaSchema = z
  .object({
    version: z.string().min(1).optional(),
    correlationId: z.string().min(1).optional(),
    idempotencyKey: z.string().min(1).optional(),
    timestamp: UtcDateTimeSchema.optional(),
    source: z.string().min(1).optional(),
    actorId: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type EnvelopeMeta = z.infer<typeof EnvelopeMetaSchema>;

/** Generic envelope factory for transport payloads. */
export function Envelope<T extends z.ZodTypeAny>(payloadSchema: T) {
  return z
    .object({
      meta: EnvelopeMetaSchema.optional(),
      payload: payloadSchema,
    })
    .strict();
}

/** Standard success envelope factory. */
export function SuccessEnvelope<T extends z.ZodTypeAny>(payloadSchema: T) {
  return z
    .object({
      meta: EnvelopeMetaSchema.optional(),
      payload: payloadSchema,
      status: z.literal("success"),
    })
    .strict();
}

/** Alias kept for callers preferring explicit *Schema naming. */
export const SuccessEnvelopeSchema = SuccessEnvelope;

export const ErrorDetailsSchema = z.record(z.string(), z.unknown()).optional();

/** Standard error envelope schema. */
export const ErrorEnvelopeSchema = z
  .object({
    meta: EnvelopeMetaSchema.optional(),
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        details: ErrorDetailsSchema,
      })
      .strict(),
    status: z.literal("error"),
  })
  .strict();

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/** Cursor envelope factory for paginated payloads. */
export function CursorEnvelope<T extends z.ZodTypeAny>(payloadSchema: T) {
  return z
    .object({
      meta: EnvelopeMetaSchema.optional(),
      cursor: z.string().nullable(),
      payload: payloadSchema,
      pageInfo: z
        .object({
          hasNext: z.boolean().optional(),
          hasPrevious: z.boolean().optional(),
          limit: z.number().int().positive().optional(),
          returned: z.number().int().nonnegative().optional(),
        })
        .strict()
        .optional(),
      status: z.literal("success"),
    })
    .strict();
}

/** Alias kept for callers preferring explicit *Schema naming. */
export const CursorEnvelopeSchema = CursorEnvelope;

export type SuccessEnvelopeType<TPayload> = {
  meta?: EnvelopeMeta;
  payload: TPayload;
  status: "success";
};

export type CursorEnvelopeType<TPayload> = {
  meta?: EnvelopeMeta;
  cursor: string | null;
  payload: TPayload;
  pageInfo?: {
    hasNext?: boolean;
    hasPrevious?: boolean;
    limit?: number;
    returned?: number;
  };
  status: "success";
};

export const Envelopes = {
  Envelope,
  SuccessEnvelope,
  SuccessEnvelopeSchema,
  ErrorEnvelopeSchema,
  CursorEnvelope,
  CursorEnvelopeSchema,
  EnvelopeMetaSchema,
  ErrorDetailsSchema,
};

export default Envelopes;
