import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  applyDateOrderRefinement,
  CommDateRangeSchema,
  CommListLimitSchema,
  CommSearchLimitSchema,
} from "../query";

describe("comm shared query primitives", () => {
  it("applies default list and search limits", () => {
    const listParsed = CommListLimitSchema.parse(undefined);
    const searchParsed = CommSearchLimitSchema.parse(undefined);

    expect(listParsed).toBe(50);
    expect(searchParsed).toBe(20);
  });

  it("rejects list limits above max", () => {
    const result = CommListLimitSchema.safeParse(201);
    expect(result.success).toBe(false);
  });

  it("rejects search limits above max", () => {
    const result = CommSearchLimitSchema.safeParse(51);
    expect(result.success).toBe(false);
  });

  it("rejects date ranges where fromDate is after toDate", () => {
    const result = CommDateRangeSchema.safeParse({
      fromDate: "2026-03-20",
      toDate: "2026-03-01",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid date ranges", () => {
    const parsed = CommDateRangeSchema.parse({
      fromDate: "2026-03-01",
      toDate: "2026-03-20",
    });

    expect(parsed.fromDate).toBe("2026-03-01");
    expect(parsed.toDate).toBe("2026-03-20");
  });

  it("reuses date-order helper with custom field names", () => {
    const Schema = z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        applyDateOrderRefinement(data, ctx, {
          fromKey: "startDate",
          toKey: "endDate",
          message: "endDate must be on or after startDate.",
        });
      });

    const result = Schema.safeParse({
      startDate: "2026-02-10",
      endDate: "2026-02-01",
    });

    expect(result.success).toBe(false);
  });
});
