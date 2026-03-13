import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  makeCommListResponseSchema,
  makeCommSearchResponseSchema,
  makeCommSummaryResponseSchema,
} from "../response";

describe("comm shared response envelopes", () => {
  const ItemSchema = z.object({ id: z.string().uuid(), name: z.string() });

  it("accepts valid list response envelope", () => {
    const schema = makeCommListResponseSchema(ItemSchema);
    const parsed = schema.parse({
      data: [{ id: "11111111-1111-4111-8111-111111111111", name: "A" }],
      meta: { cursor: null, hasMore: false, limit: 50 },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(parsed.meta.hasMore).toBe(false);
  });

  it("rejects list response envelope with invalid limit", () => {
    const schema = makeCommListResponseSchema(ItemSchema);
    const result = schema.safeParse({
      data: [],
      meta: { cursor: null, hasMore: false, limit: 9999 },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid search response envelope", () => {
    const schema = makeCommSearchResponseSchema(ItemSchema);
    const parsed = schema.parse({
      data: [{ id: "11111111-1111-4111-8111-111111111111", name: "A" }],
      meta: { cursor: null, hasMore: false, limit: 20, query: "alpha" },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(parsed.meta.query).toBe("alpha");
  });

  it("accepts valid summary response envelope", () => {
    const summaryData = z.object({
      totalCount: z.number().int().nonnegative(),
      groups: z.array(z.object({ key: z.string(), count: z.number().int().nonnegative() })),
    });
    const schema = makeCommSummaryResponseSchema(summaryData);
    const parsed = schema.parse({
      data: {
        totalCount: 3,
        groups: [
          { key: "open", count: 2 },
          { key: "done", count: 1 },
        ],
      },
      correlationId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });

    expect(parsed.data.totalCount).toBe(3);
  });
});
