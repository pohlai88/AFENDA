import { z } from "zod";
import { describe, expect, it } from "vitest";
import { composeRefinements, nullableDefault } from "../schema.helpers.js";

describe("schema.helpers", () => {
  it("applies nullable default helper", () => {
    const Schema = z.object({
      note: nullableDefault(z.string().trim().min(1)),
    });

    const parsed = Schema.parse({});

    expect(parsed.note).toBeNull();
  });

  it("composes refinements in order", () => {
    const BaseSchema = z.object({
      value: z.number(),
    });

    const RefinedSchema = composeRefinements(BaseSchema, [
      (schema) =>
        schema.superRefine((data, ctx) => {
          if (data.value < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "value must be non-negative",
              path: ["value"],
            });
          }
        }),
      (schema) =>
        schema.superRefine((data, ctx) => {
          if (data.value % 2 !== 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "value must be even",
              path: ["value"],
            });
          }
        }),
    ]);

    const result = RefinedSchema.safeParse({ value: -1 });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues).toHaveLength(2);
    expect(result.error.issues.map((issue) => issue.message)).toEqual([
      "value must be non-negative",
      "value must be even",
    ]);
  });
});
