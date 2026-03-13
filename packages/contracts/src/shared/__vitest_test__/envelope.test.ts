import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ErrorEnvelopeSchema,
  makeCursorEnvelope,
  makeCursorEnvelopeSchema,
  makeErrorEnvelope,
  makeSuccessEnvelope,
  makeSuccessEnvelopeSchema,
} from "../envelope";

const correlationId = "11111111-1111-4111-8111-111111111111";

describe("shared envelope", () => {
  it("accepts valid success envelope and rejects missing correlationId", () => {
    const schema = makeSuccessEnvelopeSchema(z.object({ name: z.string() }));

    const valid = schema.safeParse({
      data: { name: "alpha" },
      correlationId,
    });
    const invalid = schema.safeParse({
      data: { name: "alpha" },
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("rejects cursor when hasMore is false", () => {
    const schema = makeCursorEnvelopeSchema(z.object({ id: z.string() }));

    const result = schema.safeParse({
      data: [{ id: "a" }],
      cursor: "abc",
      hasMore: false,
      correlationId,
    });

    expect(result.success).toBe(false);
  });

  it("rejects null/blank cursor when hasMore is true", () => {
    const schema = makeCursorEnvelopeSchema(z.object({ id: z.string() }));

    const nullCursor = schema.safeParse({
      data: [{ id: "a" }],
      cursor: null,
      hasMore: true,
      correlationId,
    });

    const blankCursor = schema.safeParse({
      data: [{ id: "a" }],
      cursor: "   ",
      hasMore: true,
      correlationId,
    });

    expect(nullCursor.success).toBe(false);
    expect(blankCursor.success).toBe(false);
  });

  it("rejects invalid ApiError shape in error envelope", () => {
    const result = ErrorEnvelopeSchema.safeParse({
      error: {
        code: "NOT_A_REAL_CODE",
        message: "bad",
      },
      correlationId,
    });

    expect(result.success).toBe(false);
  });

  it("runtime builders produce parseable envelopes", () => {
    const success = makeSuccessEnvelope(z.object({ id: z.string() }), { id: "x" }, correlationId);

    const cursor = makeCursorEnvelope(
      z.object({ id: z.string() }),
      [{ id: "x" }],
      "next_1",
      true,
      correlationId,
    );

    const error = makeErrorEnvelope(
      {
        code: "SHARED_VALIDATION_ERROR",
        message: "validation failed",
      },
      correlationId,
    );

    expect(success.correlationId).toBe(correlationId);
    expect(cursor.hasMore).toBe(true);
    expect(error.error.code).toBe("SHARED_VALIDATION_ERROR");
  });
});
