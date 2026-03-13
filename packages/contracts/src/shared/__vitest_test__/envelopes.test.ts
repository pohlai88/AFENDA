import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  CursorEnvelope,
  CursorEnvelopeSchema,
  Envelope,
  ErrorEnvelopeSchema,
  SuccessEnvelope,
  SuccessEnvelopeSchema,
} from "../envelopes";

describe("shared envelopes", () => {
  const InvoicePayload = z.object({
    id: z.string().uuid(),
    amountMinor: z.bigint(),
    currencyCode: z.string().length(3),
  });

  it("SuccessEnvelope validates payload and rejects malformed payload", () => {
    const schema = SuccessEnvelope(InvoicePayload);

    const valid = schema.safeParse({
      meta: { version: "v1", source: "api" },
      payload: {
        id: "11111111-1111-4111-8111-111111111111",
        amountMinor: 123n,
        currencyCode: "USD",
      },
      status: "success",
    });

    const invalid = schema.safeParse({
      payload: {
        id: "not-a-uuid",
        amountMinor: 123n,
        currencyCode: "USD",
      },
      status: "success",
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("CursorEnvelope accepts cursor null and cursor string", () => {
    const schema = CursorEnvelope(z.array(InvoicePayload));

    const nullCursor = schema.safeParse({
      cursor: null,
      payload: [],
      status: "success",
      pageInfo: { hasNext: false, returned: 0 },
    });

    const stringCursor = schema.safeParse({
      cursor: "opaque:next:1",
      payload: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          amountMinor: 500n,
          currencyCode: "EUR",
        },
      ],
      status: "success",
      pageInfo: { hasNext: true, limit: 20, returned: 1 },
    });

    expect(nullCursor.success).toBe(true);
    expect(stringCursor.success).toBe(true);
  });

  it("Envelope supports roundtrip parse with enriched meta", () => {
    const schema = Envelope(InvoicePayload);

    const payload = {
      meta: {
        version: "v2",
        correlationId: "corr-123",
        idempotencyKey: "idem-123",
        source: "worker",
        actorId: "principal-1",
        tags: ["reconcile", "nightly"],
        metadata: { runId: "run-7" },
      },
      payload: {
        id: "33333333-3333-4333-8333-333333333333",
        amountMinor: 1n,
        currencyCode: "JPY",
      },
    };

    const encoded = JSON.stringify(payload, (_k, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    const decoded = JSON.parse(encoded, (key, value) =>
      key === "amountMinor" && typeof value === "string" ? BigInt(value) : value,
    );

    const parsed = schema.parse(decoded);
    expect(parsed.meta?.metadata?.runId).toBe("run-7");
    expect(parsed.payload.amountMinor).toBe(1n);
  });

  it("ErrorEnvelopeSchema validates stable error shape", () => {
    const valid = ErrorEnvelopeSchema.safeParse({
      meta: { correlationId: "abc" },
      error: {
        code: "INVALID_INPUT",
        message: "Missing amount",
        details: { field: "amount" },
      },
      status: "error",
    });

    const invalid = ErrorEnvelopeSchema.safeParse({
      error: {
        code: "",
        message: "Missing amount",
      },
      status: "error",
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("rejects unknown fields to prevent schema drift", () => {
    const schema = SuccessEnvelope(InvoicePayload);
    const result = schema.safeParse({
      payload: {
        id: "44444444-4444-4444-8444-444444444444",
        amountMinor: 10n,
        currencyCode: "USD",
      },
      status: "success",
      extraField: true,
    });

    expect(result.success).toBe(false);
  });

  it("schema alias exports behave the same as factory exports", () => {
    const viaFactory = SuccessEnvelope(InvoicePayload);
    const viaAlias = SuccessEnvelopeSchema(InvoicePayload);
    const viaCursorFactory = CursorEnvelope(z.array(InvoicePayload));
    const viaCursorAlias = CursorEnvelopeSchema(z.array(InvoicePayload));

    const input = {
      payload: {
        id: "55555555-5555-4555-8555-555555555555",
        amountMinor: 8n,
        currencyCode: "USD",
      },
      status: "success" as const,
    };

    expect(viaFactory.safeParse(input).success).toBe(true);
    expect(viaAlias.safeParse(input).success).toBe(true);
    expect(
      viaCursorFactory.safeParse({ payload: [input.payload], status: "success", cursor: null })
        .success,
    ).toBe(true);
    expect(
      viaCursorAlias.safeParse({ payload: [input.payload], status: "success", cursor: null })
        .success,
    ).toBe(true);
  });
});
